{ pkgs ? import ./pkgs.nix}:

pkgs.mkYarnPackage rec {
  src = [
    (pkgs.nix-gitignore.gitignoreSourcePure
        [''
          build
          node_modules
        '']
        ../frontend)
  ];
  packageJSON = ../frontend/package.json;
  yarnLock = ../frontend/yarn.lock;
  yarnNix = ../frontend/yarn.nix;
  configurePhase = ''
    cp -r $node_modules node_modules
    chmod +w node_modules
  '';
  buildPhase = ''
    export HOME=$(mktemp -d)
    yarn --offline build
  '';
  installPhase = ''
    mv build $out
  '';
  distPhase = "true";
}