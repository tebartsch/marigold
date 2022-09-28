#!/usr/bin/env python

import logging
import os
import sys
import argparse
import urllib.parse
import time
from gevent import monkey
monkey.patch_all()
from flask import Flask, send_from_directory, jsonify, render_template
from flask_socketio import SocketIO
from werkzeug.security import safe_join

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
parser.add_argument('--only-backend', action='store_true',
                    help="Don't serve the frontend located in folders templates and static.")
args = parser.parse_args()

app = Flask(__name__, template_folder="templates", static_folder="static")
socketio = SocketIO(app, async_mode="gevent")

# Store command line options in app config
for k, v in vars(args).items():
    app.config[k] = v


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
            elem_path = "/" + os.path.normpath(os.path.join(path, name))
            elem_path_norm = urllib.parse.quote_plus(elem_path, safe="/")
            if os.path.isdir(dir_elem_path):
                node = {
                    "title": name,
                    "path": elem_path_norm,
                    "isLeaf": False,
                }
                sub_directories.append(node)
            else:
                node = {
                    "title": name,
                    "path": elem_path_norm,
                    "isLeaf": True,
                }
                files.append(node)

    print(jsonify(sub_directories + files))

    return jsonify(sub_directories + files)


@app.route('/')
def dirtree():
    print(app.config['only_backend'])
    if app.config['only_backend']:
        return "Frontend is not being served since `--only-backend` flag has been set."
    else:
        return render_template(
            'index.html',
            webpage_title=app.config['webpage_title'],
        )


@app.route('/blob/<path:path>')
def send_file(path):
    directory = app.config.get('directory')
    base_path = os.path.join(os.path.realpath(os.path.curdir), directory)
    return send_from_directory(base_path, path)


class SendFileContents:
    # [
    #   "655e480a-32be-4cae-8e70-c05dd71fb8f0",
    #   "2952c431-bffe-4761-87b2-e2efbad274ee",
    #   "7913eeb8-2ba8-4c0a-87ee-f1935dfb8604",
    #   ...
    # ]
    sending = []

    def __init__(self, socketio):
        self.socketio = socketio

    def do_work(self, path, identifier):
        self.sending.append(identifier)
        while True:
            max_ws_message_bytes = 524288
            logging.info(f"WEBSOCKET: received data request for path '{path}'.")
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
                    else:
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
                    "uuid": identifier,
                }, namespace="/")

            for data in follow(open(full_path, 'r')):
                if (identifier in self.sending) and data:
                    _emit(data)


send_file_contents = None


@socketio.on('connect')
def connect():
    print("connected")
    global send_file_contents
    send_file_contents = SendFileContents(socketio)


@socketio.on('data request')
def send_file_via_websockets(message):
    SendFileContents.sending = []
    path = message['path']
    uuid = message['uuid']
    if send_file_contents is not None:
        milliseconds = int(round(time.time() * 1000))
        socketio.start_background_task(target=send_file_contents.do_work,
                                       path=path, identifier=uuid)


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
