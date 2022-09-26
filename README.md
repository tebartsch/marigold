# Marigold

[![PyPI pyversions](https://img.shields.io/pypi/pyversions/marigold)](https://pypi.org/project/marigold/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Commits](https://img.shields.io/github/last-commit/tilmann-bartsch/marigold/master)](https://github.com/tilmann-bartsch/marigold/commits/master)

Marigold is a tiny server used to examine and compare the contents of hierarchical structured files.

<p align="center">
  <img width="65%" src="https://github.com/tilmann-bartsch/marigold/raw/master/example/marigold/african/1.jpg">
</p>

## Installation

Pull docker image from [hub.docker.com](hub.docker.com) and run it for the files located in
the folder `content`.
```shell
docker pull tbartsch/marigold
docker run -it \
    -p 8080:8080 \
    --mount type=bind,source="$(pwd)"/content,target=/marigold/content \
    tbartsch/marigold:latest
```

## Development

Install and run
  - using yarn and python virtual environment:
    ```shell
    (cd frontend; yarn build) 
    python -m venv venv
    source venv/bin/activate
    pip install .
    marigold --directory example/marigold
    ```
  - using nix:
    ```shell
    nix-shell nix
    marigold --directory example/marigold
    ```
    
## Nix Packaging Notes

### Create `yarn.nix`-file
```shell
cd frontend
nix-shell -p yarn yarn2nix
yarn2nix > yarn.nix
```


### Docker container

Build and run docker image using nix dockerTools.
```shell
docker load < $(nix-build nix/docker.nix) || exit
docker run -it \
    -p 8080:8080 \
    --mount type=bind,source="$(pwd)"/example/marigold,target=/content \
    marigold:nightly
```

## Icons

This project uses icons of [remixicon](https://github.com/Remix-Design/remixicon) project.

## Changelog
This library adheres to a [semantic versioning](https://semver.org/) scheme.
See [CHANGELOG.md](https://github.com/tilmann-bartsch/rportion/blob/master/CHANGELOG.md) for the list of changes.

## Contributions
Contributions are very welcome! Feel free to report bugs or suggest new features using GitHub issues and/or pull requests.

## License
Distributed under [MIT License](https://github.com/tilmann-bartsch/rportion/blob/master/LICENSE).
