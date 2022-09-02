from os import path
from setuptools import setup, find_packages
from codecs import open

with open(
    path.join(path.abspath(path.dirname(__file__)), "README.md"), encoding="utf-8"
) as f:
    long_description = f.read()

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
    packages=find_packages(include=["marigold"]),
    python_requires="~= 3.7",
    install_requires=[
        "flask~=2.2.2"
    ],
)
