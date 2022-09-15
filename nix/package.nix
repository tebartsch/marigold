{ python3Packages }:
with python3Packages;
buildPythonPackage {
  pname = "marigold";
  version = "0.1.0";
  propagatedBuildInputs = [
    flask
    flask-socketio
    gevent-websocket
  ];
  src = (pkgs.nix-gitignore.gitignoreSourcePure
          [ ../.dockerignore ] ../.);

  doCheck = false;
}
