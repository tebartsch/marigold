import logging
import os
import sys
import argparse
import urllib.parse

from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, emit
from werkzeug.security import safe_join
from pygtail import Pygtail

app = Flask(__name__)
socketio = SocketIO(app)

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


@app.route('/blob/<path:path>')
def send_file(path):
    directory = app.config.get('directory')
    base_path = os.path.join(os.path.realpath(os.path.curdir), directory)
    return send_from_directory(base_path, path)


@socketio.on('data request')
def send_file_via_websockets(message):
    max_ws_message_bytes = 524288
    path = message['path']
    logging.info(f"WEBSOCKET: received data request for ath '{path}'.")
    directory = app.config.get('directory')
    base_path = os.path.join(os.path.realpath(os.path.curdir), directory)
    full_path = safe_join(base_path, os.fspath(path))

    file = Pygtail(full_path, save_on_end=False)

    def _emit(_data):
        emit("data", {
            "path": path,
            "bytes": bytes(_data, 'utf-8'),
        })

    while True:
        lines = file.readlines()
        curr_size, data = 0, ""
        for line in lines:
            if curr_size < max_ws_message_bytes:
                curr_size += sys.getsizeof(line)
                data += line
            else:
                _emit(data)
                curr_size, data = 0, ""
        if data:
            _emit(data)


def main(arguments):
    # Store command line options in app config
    for k, v in vars(arguments).items():
        app.config[k] = v

    # Configure logging
    console = logging.StreamHandler(sys.stdout)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[console]
    )

    port = app.config["port"]
    debug = app.config["debug"]
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=debug)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug', type=bool, default=False,
                        metavar='false',
                        help='Whether to start the server in debug mode.')
    parser.add_argument('--port', type=int, default=8080,
                        metavar='8080',
                        help='Port of the server.')
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
