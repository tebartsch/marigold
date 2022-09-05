import logging
import os
import sys
import argparse
import urllib.parse

from flask import Flask, render_template, send_from_directory

app = Flask(__name__)


icon_dict = {
    "folder": "static/themes/default/folder.svg",
    "file": "static/themes/default/file.svg",
    "txt": "static/themes/default/file.svg",
    "yml": "static/themes/default/file.svg",
    "yaml": "static/themes/default/file.svg",
    "jpg": "static/themes/default/image.svg",
    "jpeg": "static/themes/default/image.svg",
    "png": "static/themes/default/image.svg",
    "mp4": "static/themes/default/video.svg",
}


def has_children(path):
    if not os.path.isdir(path):
        return False
    else:
        try:
            lst = sorted(os.listdir(path))
        except OSError:
            return False
        else:
            return len(lst) > 0


@app.route('/children/', defaults={'path': '.'})
@app.route('/children/<path:path>')
def children(path):
    directory = app.config.get('directory')
    sub_directories = []
    files = []
    dir_path = os.path.join(directory, path)
    try:
        lst = sorted(os.listdir(dir_path))
    except OSError:
        pass  # ignore errors
    else:
        for name in lst:
            dir_elem_path = os.path.join(dir_path, name)
            elem_path = os.path.join(path, name)
            elem_path_norm = urllib.parse.quote_plus(elem_path, safe="/")
            if os.path.isdir(dir_elem_path):
                sub_directories.append({"text": name,
                                        "icon": icon_dict["folder"],
                                        "children": has_children(dir_elem_path),
                                        "data": {
                                            "is_directory": True,
                                            "path": elem_path_norm,
                                        }})
            else:
                ext = os.path.splitext(elem_path)[1][1:]
                if ext in icon_dict:
                    icon = icon_dict[ext]
                else:
                    icon = icon_dict["file"]
                files.append({"text": name,
                              "icon": icon,
                              "data": {
                                  "is_directory": False,
                                  "path": elem_path_norm,
                              }})

    return sub_directories + files


@app.route('/')
def dirtree():
    return render_template(
        'index.html',
        webpage_title=app.config['webpage_title'],
        sidebar_headline=app.config['sidebar_headline'],
    )


@app.route('/update-time/<path:path>')
def update_time(path):
    directory = app.config.get('directory')
    path = os.path.join(directory, path)
    return str(os.path.getmtime(path))


@app.route('/blob/<path:path>')
def send_outputs(path):
    directory = app.config.get('directory')
    base_path = os.path.join(os.path.realpath(os.path.curdir), directory)
    return send_from_directory(base_path, path)


def main(arguments):
    # Store command line options in app config
    for k, v in vars(args).items():
        app.config[k] = v

    # Configure logging
    console = logging.StreamHandler(sys.stdout)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[console]
    )

    port = app.config["port"]
    app.run(host="0.0.0.0", port=port)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8080,
                        metavar='8080',
                        help='Port of ')
    parser.add_argument('--directory', type=str, default=".",
                        metavar='path/to/folder/',
                        help='directory of the files to show')
    parser.add_argument('--webpage-title', type=str, default="Marigold",
                        metavar='example-title',
                        help='the title of the webpage')
    parser.add_argument('--sidebar-headline', type=str, default="Marigold",
                        metavar='example-headline',
                        help='the headline shown above the contents sidebar')
    args = parser.parse_args()
    main(args)
