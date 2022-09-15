{ pkgs ? import ./pkgs.nix }:
pkgs.python3Packages.callPackage ./package.nix {}
