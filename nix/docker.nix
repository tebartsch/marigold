{ pkgs ? import ./pkgs.nix }:
with pkgs;
let
  marigold = import ./default.nix { inherit pkgs; };
in
  dockerTools.buildImage {
    name = marigold.pname;
    tag = "nightly";
    created = "now";

    contents = [
        pkgs.bashInteractive
        pkgs.coreutils
        pkgs.moreutils
    ];

    config = {
      Cmd = [
              "${marigold}/bin/marigold"
              "--directory" "/content"
            ];
      ExposedPorts = {
        "8080/tcp" = { };
      };
      Volumes = { "/content" = { }; };
    };
  }
