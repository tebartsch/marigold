{
  python3Packages,
  marigold-frontend
}:
let
  ignore-files = ''
    .git
    .github
    examples
    venv
    nix
    .dockerignore
    .gitignore
    CHANGELOG.md
    result
    frontend/build
    frontend/node_modules
  '';
in
with python3Packages;
buildPythonPackage rec {
  pname = "marigold";
  version = "0.1.0";
  propagatedBuildInputs = [
    flask
    flask-socketio
    gevent-websocket
  ];
  src = [
    (pkgs.nix-gitignore.gitignoreSourcePure [ ../.gitignore ignore-files] ../.)
  ];
  preBuild = ''
    mkdir -p frontend/build
    cp -r ${marigold-frontend}/* frontend/build
  '';
  sourceRoot = pname;

  doCheck = false;
}
