{ pkgs ? import ./pkgs.nix
}:
let
  marigold-frontend = pkgs.callPackage ./frontend.nix {};
in
  pkgs.python3Packages.callPackage ./package.nix { marigold-frontend = marigold-frontend; }
