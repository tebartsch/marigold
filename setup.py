from os import path
from setuptools import setup, find_packages, find_namespace_packages
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
    packages=["marigold"],
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'marigold = marigold:main',
        ]
    },
    python_requires="~=3.9",
    install_requires=[
        "flask~=2.1.2",
        "flask-socketio~=5.1.1",
        "gevent-websocket~=0.10.1",
    ],
)
