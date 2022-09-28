from shutil import rmtree, copytree, copy
from os import path, mkdir
from setuptools import setup
from codecs import open


with open(
        path.join(path.abspath(path.dirname(__file__)), "README.md"), encoding="utf-8"
) as f:
    long_description = f.read()

# Copy frontend contents into package marigold
rmtree("marigold/templates", ignore_errors=True)
mkdir("marigold/templates")
copy("frontend/build/index.html", "marigold/templates/index.html")
rmtree("marigold/static", ignore_errors=True)
copytree("frontend/build/static", "marigold/static")

with open('requirements.txt') as f:
    required = f.read().splitlines()

setup(
    name="marigold",
    version="0.1.0",
    license="MIT",
    author="Tilmann Bartsch",
    url="https://github.com/tilmann-bartsch/marigold",
    description="Marigold is a tiny server used to examine and compare the contents of hierarchical structured files.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    # See https://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Intended Audience :: Developers",
        "Operating System :: OS Independent",
    ],
    keywords="simulation productivity hierarchy",
    packages=["marigold"],
    include_dirs=["frontend"],
    package_data={'marigold': ["frontend/*"]},
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'marigold = marigold:main',
        ]
    },
    python_requires="~=3.9",
    install_requires=required,
)
