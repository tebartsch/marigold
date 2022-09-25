import React from 'react';
import Tree from 'rc-tree';
import "rc-tree/assets/index.css"
import hljs from "highlight.js";
import "highlight.js/styles/default.css"
import io from 'socket.io-client';

import folder_icon from './themes/default/folder.svg'
import file_icon from './themes/default/file.svg'
import file_text_icon from './themes/default/file-text.svg'
import image_icon from './themes/default/image.svg'
import video_icon from './themes/default/video.svg'

import './marigold.css';

const axios = require('axios').default;

const iconsPerExtension = {
    "txt": file_text_icon,
    "yml": file_text_icon,
    "yaml": file_text_icon,
    "jpg": image_icon,
    "jpeg": image_icon,
    "png": image_icon,
    "mp4": video_icon,
};

const getNode = async (path) =>
  axios
    .get('/children' + path)
    .then((res) => {
      return res.data.map(entry => {
        const ext = entry.path.split(".").pop()
        let icon
        if (!entry.isLeaf)
            icon = folder_icon
        else if (iconsPerExtension.hasOwnProperty(ext)) {
            icon = iconsPerExtension[ext] }
        else
            icon = file_icon
        return {
          title: entry.title,
          key: entry.path,
          isLeaf: entry.isLeaf,
          icon: <img
            style={{ width: 15, padding: 1 }}
            src={icon} alt="-"
          />,
        }
      })
    })

// https://stackoverflow.com/a/50590586/11172277
const search = (tree, value, reverse = false) => {
  const stack = tree.slice()
  while (stack.length) {
    const node = stack[reverse ? 'pop' : 'shift']()
    if (node.key === value) return node
    node.children && stack.push(...node.children)
  }
  return null
}

class ContentTree extends React.Component {
  state = {
    treeData: [],
  };

  componentDidMount() {
    getNode("/")
      .then((data) => {
        this.setState({
          treeData: data
        })
      })
  }

  onLoadData = treeNode => {
    return new Promise(resolve => {
      const path = treeNode.key
      getNode(path)
        .then((data) => {
          const treeData = [...this.state.treeData];

          // The following lines are used to find the entry in `treeData` that corresponds to the selected
          // node `treeNode`.
          const positions = treeNode.pos.split("-").map(numStr => parseInt(numStr))
          const non_leaf_positions = positions.slice(1, -1)
          const leaf_position = positions.at(-1)
          const last_non_leaf_children = non_leaf_positions.reduce((obj, pos) => obj[pos].children, treeData)
          const leaf = last_non_leaf_children[leaf_position]

          // Update the children of the leaf node selected
          leaf.children = data

          this.setState({ treeData });
          resolve();
        })
    });
  };

  onSelect = (info) => {
    for (const key of info) {
      const node = search(this.state.treeData, key)
      if (node.isLeaf)
        this.props.selectContent(key)
      this.props.emitDataRequest(key)
    }
  }

  onMouseEnter = event => {
    if (event.node.isLeaf)
      this.props.hoverContent(event.node.key)
    this.props.emitDataRequest(event.node.key)
  }

  onMouseLeave = event => {
    if (event.node.isLeaf)
      this.props.dehoverContent()
  }

  render() {
    return (
      <Tree
        onSelect={this.onSelect}
        loadData={this.onLoadData}
        treeData={this.state.treeData}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        expandAction="click"
      />
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      textContent: null
    };
    this.textContentRef = React.createRef();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.textContentRef.current !== null)
       hljs.highlightElement(this.textContentRef.current)
  }

  render() {
    const path = this.props.contentPath
    if (path) {
      let asset_path = "//" + document.location.host + "/blob" + path;
      let asset_path_decoded = decodeURIComponent(asset_path);

      let highlight_js_dict = {
         txt: 'language-plaintext',
         yml: 'language-yaml',
         yaml: 'language-yaml',
      };

      let file_type = path.split('.').pop();
      if (file_type) {
        if (file_type === "mp4") {
          return (
            <div>
              <p><a className='content-link' href={asset_path} id='content-link'>
                {asset_path_decoded}
              </a></p>
              <video className='inherit-height' controls>
                <source src={asset_path} type='video/mp4'/>
              </video>
            </div>
          )
        } else if (highlight_js_dict.hasOwnProperty(file_type)) {
          return (
            <div id='text-content' className="inherit-height text-content">
              <a href={asset_path} id='content-link'>source</a>
              <pre className='preformatted'>
                <code className={highlight_js_dict[file_type]} ref={this.textContentRef}>
                  {this.props.textContent}
                </code>
              </pre>
            </div>
          );
        } else {
          return (
            <a href={asset_path}>
              <img className='image' src={asset_path} alt={asset_path_decoded}/>
            </a>
          );
        }
      }
    }
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedContentPath: null,
      contentPath: null,
      textContent: null
    }

    this.socket = io()
    this.textDecoder = new TextDecoder();

    this.emitDataRequest = this.emitDataRequest.bind(this)
  }

  componentWillUnmount() {
    this.socket.close()
  }

  emitDataRequest(path) {
    this.setState({
      textContent: null
    })
    this.socket.on('data', (msg) => {
      if (msg.path === this.state.contentPath) {
        const text = this.textDecoder.decode(msg.bytes)
        if (this.state.textContent === null)
          this.setState({
            textContent: text,
          })
        else
          this.setState({
            textContent: this.state.textContent + text
          })
      }
    })
    this.socket.emit("data request", {
      path: path
    })
  }

  selectContent(path) {
    this.setState({
      selectedContentPath: path,
      contentPath: path,
    })
  }

  hoverContent(path) {
    this.setState({
      contentPath: path,
    })
  }

  dehoverContent() {
    this.setState({
      contentPath: this.state.selectedContentPath,
    })
  }

  render() {
    return (
      <div>
        <div className="container">
          <div className="sidebar">
            <h1> Contents </h1>
            <ContentTree
              selectContent={path => this.selectContent(path)}
              hoverContent={path => this.hoverContent(path)}
              dehoverContent={_ => this.dehoverContent()}
              emitDataRequest={this.emitDataRequest}
            />
          </div>
          <div id="content" className="content">
            <Content
              contentPath={this.state.contentPath}
              textContent={this.state.textContent}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
