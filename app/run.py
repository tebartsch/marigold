import logging
import os
import sys
import argparse
import urllib.parse
import time

from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO
from werkzeug.security import safe_join
from gevent import monkey

monkey.patch_all()

parser = argparse.ArgumentParser()
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

app = Flask(__name__)
socketio = SocketIO(app, async_mode="gevent")

# Store command line options in app config
for k, v in vars(args).items():
    app.config[k] = v

icon_dict = {
    "folder": "/static/themes/default/folder.svg",
    "file": "/static/themes/default/file.svg",
    "txt": "/static/themes/default/file.svg",
    "yml": "/static/themes/default/file.svg",
    "yaml": "/static/themes/default/file.svg",
    "jpg": "/static/themes/default/image.svg",
    "jpeg": "/static/themes/default/image.svg",
    "png": "/static/themes/default/image.svg",
    "mp4": "/static/themes/default/video.svg",
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
    show = request.args.get('show', default=".", type=str)

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
            elem_path = "/" + os.path.normpath(os.path.join(path, name))
            elem_path_norm = urllib.parse.quote_plus(elem_path, safe="/")
            if os.path.isdir(dir_elem_path):
                if show is None:
                    opened = False
                else:
                    opened = show.startswith(elem_path)
                node = {
                    "text": name,
                    "icon": icon_dict["folder"],
                    "children": has_children(dir_elem_path),
                    "state": {"opened": opened},
                    "data": {
                        "is_directory": True,
                        "path": elem_path_norm,
                    }
                }
                sub_directories.append(node)
            else:
                ext = os.path.splitext(elem_path)[1][1:]
                if ext in icon_dict:
                    icon = icon_dict[ext]
                else:
                    icon = icon_dict["file"]
                show_content = elem_path == show
                node = {
                    "text": name,
                    "icon": icon,
                    "data": {
                        "is_directory": False,
                        "path": elem_path_norm,
                        "show_content": show_content,
                    }
                }
                print(node)
                files.append(node)

    return sub_directories + files


@app.route('/', defaults={'path': '.'})
@app.route('/<path:path>', strict_slashes=False)
def dirtree(path):
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


class SendFileContents:
    # {
    #   "path/to/file": ["id1", "id2"],
    #   ---
    # }
    sending = {}

    def __init__(self, socketio):
        self.socketio = socketio

    def do_work(self, path, identifier):
        self.sending[path] = [identifier]
        while True:
            max_ws_message_bytes = 524288
            logging.info(f"WEBSOCKET: received data request for ath '{path}'.")
            directory = app.config.get('directory')
            base_path = os.path.join(os.path.realpath(os.path.curdir), directory)
            full_path = safe_join(base_path, path.lstrip('/'))

            def follow(_file):
                curr_size, data = 0, ""
                while True:
                    lines = _file.readlines()
                    if not lines:
                        yield data
                        time.sleep(0.1)
                    for line in lines:
                        curr_size += sys.getsizeof(line)
                        data += line
                        if curr_size >= max_ws_message_bytes:
                            yield data
                            curr_size, data = 0, ""
                    yield data
                    curr_size, data = 0, ""

            def _emit(_data):
                socketio.emit("data", {
                    "path": path,
                    "bytes": bytes(_data, 'utf-8'),
                }, namespace="/")

            for data in follow(open(full_path, 'r')):
                if identifier not in self.sending[path]:
                    if not self.sending[path]:
                        del self.sending[path]
                    return
                _emit(data)


send_file_contents = None


@socketio.on('connect')
def connect():
    global send_file_contents
    send_file_contents = SendFileContents(socketio)


@socketio.on('data request')
def send_file_via_websockets(message):
    for k in SendFileContents.sending:
        SendFileContents.sending[k] = []
    path = message['path']
    if send_file_contents is not None:
        milliseconds = int(round(time.time() * 1000))
        socketio.start_background_task(target=send_file_contents.do_work,
                                       path=path, identifier=str(milliseconds))


def main():
    # Configure logging
    console = logging.StreamHandler(sys.stdout)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[console]
    )

    port = app.config["port"]

    socketio.run(app, host="0.0.0.0", port=port)


if __name__ == '__main__':
    main()
