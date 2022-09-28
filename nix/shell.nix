{ pkgs ? import ./pkgs.nix }:
let
  frontend-path = builtins.toString ../frontend;
  marigold-frontend = pkgs.callPackage ./frontend.nix {};
  marigold = pkgs.callPackage ./package.nix { inherit marigold-frontend; };
in
pkgs.mkShell rec {
  nativeBuildInputs =
    marigold-frontend.buildInputs ++
    marigold.propagatedBuildInputs;

  node_modules = marigold-frontend.node_modules;

  shellHook = ''
    temp_node_modules_dir=$(mktemp -d)
    echo "Created temporary directory '$temp_node_modules_dir'."

    echo "Create symbolic link for the contents of '${node_modules}/*' to '$temp_node_modules_dir'."
    # For the curly braces expression see https://unix.stackexchange.com/a/186219.
    mkdir $temp_node_modules_dir/node_modules
    ln -s ${node_modules}/{*,.[^.],.??*} $temp_node_modules_dir/node_modules

    echo "Create symbolic link to '$temp_node_modules_dir/node_modules' at '${frontend-path}/node_modules'."
    if [[ -d ${frontend-path}/node_modules || -L ${frontend-path}/node_modules ]]; then
      echo "Directory '${frontend-path}/node_modules' is already present. Replacing."
      rm -rf ${frontend-path}/node_modules
    fi
    ln -s $temp_node_modules_dir/node_modules ${frontend-path}/node_modules

    echo "Directory '$temp_node_modules_dir' will be removed when this shell is exited."
    function finish {
      rm -rf $temp_node_modules_dir
    }
    trap finish EXIT
  '';

}
