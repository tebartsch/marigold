{ pkgs ? import ./pkgs.nix }:
let marigold = pkgs.python3Packages.callPackage ./package.nix {};
in pkgs.python3Packages.toPythonApplication marigold
