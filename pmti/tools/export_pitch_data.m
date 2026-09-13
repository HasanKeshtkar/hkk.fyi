function export_pitch_data(outFile)
% Export everything the pitch page needs into one JSON file.
%  - FEM fields E1x,E1y,E2x,E2y resampled on an NGxNG grid (same as TI_interactive_map.m)
%  - measured 7x7 |E_AM,x| / |E_AM,y| pixel maps for k = 1,2,3 (same pipeline as
%    Phantom_measured_vs_simulated.m)
%  - centre-node measured voltage (band-passed, rescaled by k), decimated, for k = 1,2,3
proj = 'C:/Users/hasan/Desktop/B.Sc_final_project/phantom_test_PMTI';
cd(proj);
R = 35; NG = 101; STEP = 10; STEP_M = STEP/1000; GAIN = 500;
EG = [168.5 -168.5]; EK = [11.5 -11.5];

%% ---- FEM grids ----
[xn,yn,e1x] = read_field('simulation_export/Ex1_re.csv');
[~ ,~ ,e1y] = read_field('simulation_export/Ey1_re.csv');
[~ ,~ ,e2x] = read_field('simulation_export/Ex2_re.csv');
[~ ,~ ,e2y] = read_field('simulation_export/Ey2_re.csv');
in = hypot(xn,yn) <= R + 1e-6;
xn = xn(in); yn = yn(in); e1x = e1x(in); e1y = e1y(in); e2x = e2x(in); e2y = e2y(in);
xq = linspace(-R,R,NG); [XQ,YQ] = meshgrid(xq,xq); out = hypot(XQ,YQ) > R;
[uu,ia] = unique([xn yn],'rows','stable');
gr = @(v) setnan(griddata(uu(:,1),uu(:,2),v(ia),XQ,YQ,'linear'),out);
G.E1x = gr(e1x); G.E1y = gr(e1y); G.E2x = gr(e2x); G.E2y = gr(e2y);

% scale to integers (1e-5 V/m resolution) to keep the JSON compact; NaN -> null
q = @(Z) round(Z*1e5);
S.grid.R = R; S.grid.NG = NG; S.grid.scale = 1e-5;
S.grid.note = 'row index = y (from -R to +R), column index = x (from -R to +R); values * scale = V/m; null = outside phantom';
S.grid.E1y = q(G.E1y); S.grid.E2y = q(G.E2y);
S.electrodes.pair1_deg = EG; S.electrodes.pair2_deg = EK;

% simulated FWHM along y = 0 for k = 1,2,3 (y component), fine grid
xf = linspace(-R,R,2001);
for k = 1:3
    Z = env_k(G.E1y,G.E2y,k);
    % profile on y=0 row (interp along x)
    prof = interp2(XQ,YQ,Z,xf,zeros(size(xf)),'linear');
    pk = max(prof); half = pk/2;
    ii = find(prof >= half); 
    S.sim.fwhm_mm(k) = xf(ii(end)) - xf(ii(1));
    S.sim.peak_Vpm(k) = pk;
end
fprintf('sim FWHM (mm): %s\n', mat2str(S.sim.fwhm_mm,4));

%% ---- measured pixel maps ----
for K = 1:3
    D = sprintf('measured_raw_data_k%d',K);
    T = read_index_(fullfile(D,'index.csv'));
    NX = 7; NY = 7; have = false(NX,NY); XM = nan(NX,NY); YM = nan(NX,NY); V = [];
    for n = 1:numel(T.file)
        ix = T.ix(n); iy = T.iy(n);
        M = dlmread(fullfile(D,[T.file{n} '.csv']),',',2,0);
        v = M(:,2)/GAIN;
        if isempty(V), V = nan(NX,NY,numel(v)); end
        V(ix,iy,:) = v - mean(v); XM(ix,iy) = T.x_mm(n); YM(ix,iy) = T.y_mm(n); have(ix,iy) = true;
    end
    NS = size(V,3);
    fid = fopen(fullfile(D,[T.file{1} '.csv'])); fgetl(fid); hdr = strsplit(fgetl(fid),','); fclose(fid);
    dt = str2double(hdr{4}); fs = 1/dt;
    Vraw = V;
    [bB,aB] = butter(4,[1800 2200]/(fs/2),'bandpass');
    for i = 1:NX, for j = 1:NY, if have(i,j), V(i,j,:) = filtfilt(bB,aB,squeeze(V(i,j,:))); end, end, end
    Vfilt = K*V;
    EXm = local_grad(Vfilt,have,1,STEP_M); EYm = local_grad(Vfilt,have,2,STEP_M);
    BOX = ones(round(1e-3*fs),1); BOX = BOX/numel(BOX);
    lo = round(0.08*NS); hi = round(0.92*NS);
    MEASX = local_env(EXm,have,BOX,lo,hi); MEASY = local_env(EYm,have,BOX,lo,hi);
    % sampled simulation at the same nodes, for the correlation number
    SX = nan(NX,NY); SY = nan(NX,NY);
    for i = 1:NX, for j = 1:NY, if have(i,j)
        SX(i,j) = interp2(XQ,YQ,env_k(G.E1x,G.E2x,K),XM(i,j),YM(i,j));
        SY(i,j) = interp2(XQ,YQ,env_k(G.E1y,G.E2y,K),XM(i,j),YM(i,j));
    end, end, end
    mx = isfinite(MEASX)&isfinite(SX); my = isfinite(MEASY)&isfinite(SY);
    cx = corrcoef(MEASX(mx),SX(mx)); cy = corrcoef(MEASY(my),SY(my));
    fprintf('k=%d  peak y: sim %.4f meas %.4f   corr x %.3f y %.3f\n',K,max(SY(:)),max(MEASY(:)),cx(1,2),cy(1,2));
    % measured FWHM along y=0 row (linear interp of the 7 pixels)
    row = MEASY(:,4); xr = XM(:,4); okr = isfinite(row);
    xfine = linspace(-30,30,601); pf = interp1(xr(okr),row(okr),xfine,'linear');
    half = max(pf)/2; ii = find(pf >= half);
    mf = xfine(ii(end)) - xfine(ii(1));
    fprintf('     measured FWHM along y=0 (linear): %.1f mm\n', mf);
    m.k = K; m.x_mm = XM(:,1)'; m.y_mm = YM(1,:);
    m.have = have; m.EAMy = round(MEASY*1e4)/1e4; m.simy_at_nodes = round(SY*1e4)/1e4;
    m.corr_x = cx(1,2); m.corr_y = cy(1,2); m.fwhm_meas_lin_mm = mf;
    m.note = 'EAMx/EAMy are 7x7 with row index = ix (x from -30 to +30), col index = iy (y from -30 to +30); NaN = not measured';
    % centre node waveform, decimated
    [~,ci] = min(abs(XM(:,4))); [~,cj] = min(abs(YM(4,:)));
    vF = squeeze(Vfilt(ci,cj,:))*1e6; vR = squeeze(Vraw(ci,cj,:))*1e6;
    st = 5; idx = 1:st:NS;
    m.centre.fs = fs/st; m.centre.v_raw_uV = round(vR(idx)'*10)/10;
    % also the recovered field at centre (y comp) with its envelope
    ey = squeeze(EYm(ci,cj,:)); env = conv(abs(hilbert(ey)),BOX,'same');
    m.centre.Ey_Vpm = round(ey(idx)'*1e4)/1e4;
    S.meas{K} = m;
end

txt = ['window.PMTI_DATA = ' jsonencode(S) ';'];
txt = strrep(txt,'NaN','null');
fid = fopen(outFile,'w'); fwrite(fid,txt); fclose(fid);
fprintf('wrote %s (%d bytes)\n', outFile, numel(txt));
end

function [x,y,e] = read_field(f)
M = dlmread(f,',',1,0); x = M(:,1); y = M(:,2); e = M(:,3);
end
function Z = setnan(Z,out), Z(out) = NaN; end
function e = env_k(e1,e2,k)
d = e1 - e2; e = abs( sqrt(max(k^2*d.^2 + 4*e1.*e2, 0)) - k*abs(d) );
end
function T = read_index_(f)
fid = fopen(f); C = textscan(fid,'%s %f %f %f %f','Delimiter',',','HeaderLines',1); fclose(fid);
T.file = C{1}; T.ix = C{2}; T.iy = C{3}; T.x_mm = C{4}; T.y_mm = C{5};
end
function E = local_grad(V,have,dim,h)
[NX,NY,NS] = size(V); E = nan(NX,NY,NS);
for i = 1:NX
    for j = 1:NY
        if ~have(i,j), continue; end
        p = @(d) deal(i + (dim==1)*d, j + (dim==2)*d);
        ok = @(d) inbounds(i+(dim==1)*d, j+(dim==2)*d, NX,NY,have);
        [ap,bp] = p( 1); [am,bm] = p(-1); [a2,b2] = p( 2); [a3,b3] = p(-2);
        if ok(1) && ok(-1)
            E(i,j,:) = -(V(ap,bp,:) - V(am,bm,:))/(2*h);
        elseif ok(1) && ok(2)
            E(i,j,:) = -(-3*V(i,j,:) + 4*V(ap,bp,:) - V(a2,b2,:))/(2*h);
        elseif ok(-1) && ok(-2)
            E(i,j,:) = -( 3*V(i,j,:) - 4*V(am,bm,:) + V(a3,b3,:))/(2*h);
        elseif ok(1)
            E(i,j,:) = -(V(ap,bp,:) - V(i,j,:))/h;
        elseif ok(-1)
            E(i,j,:) = -(V(i,j,:) - V(am,bm,:))/h;
        end
    end
end
end
function t = inbounds(i,j,NX,NY,have)
t = i>=1 && i<=NX && j>=1 && j<=NY && have(i,j);
end
function M = local_env(E,have,BOX,lo,hi)
[NX,NY,~] = size(E); M = nan(NX,NY);
for i = 1:NX
    for j = 1:NY
        if ~have(i,j) || ~isfinite(E(i,j,1)), continue; end
        e = conv(abs(hilbert(squeeze(E(i,j,:)))),BOX,'same'); e = e(lo:hi);
        M(i,j) = max(e) - min(e);
    end
end
end
