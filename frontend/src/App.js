import React from 'react';
import Tree from 'rc-tree';
import "rc-tree/assets/index.css"
import hljs from "highlight.js";
import "highlight.js/styles/default.css"
import io from 'socket.io-client';

import arrowDown from './themes/default/arrow-down-s-line.svg'
import arrowRight from './themes/default/arrow-right-s-line.svg'
import folderIcon from './themes/default/folder.svg'
import fileIcon from './themes/default/file.svg'
import fileTextIcon from './themes/default/file-text.svg'
import imageIcon from './themes/default/image.svg'
import videoIcon from './themes/default/video.svg'

import './marigold.css';

const axios = require('axios').default;


const iconsPerExtension = {
    "txt": fileTextIcon,
    "yml": fileTextIcon,
    "yaml": fileTextIcon,
    "jpg": imageIcon,
    "jpeg": imageIcon,
    "png": imageIcon,
    "mp4": videoIcon,
};

const isTextFile = (path) => {
  const textFileExtensions = ["txt", "yml", "yaml"]
  const ext = path.split(".").pop()
  return textFileExtensions.includes(ext)
}


const getNodeChildren = async (path) =>
  axios
    .get('/children' + path)
    .then((res) => {
      return Promise.all(res.data.map(entry => {
        const ext = entry.path.split(".").pop()
        let icon
        if (!entry.isLeaf)
          icon = folderIcon
        else if (iconsPerExtension.hasOwnProperty(ext)) {
          icon = iconsPerExtension[ext]
        } else
          icon = fileIcon
        let children
        if (window.location.pathname.startsWith(entry.path)) {
          children = Promise.resolve(null) // getNodeChildren(entry.path)
        } else {
          children = Promise.resolve(null)
        }
        return children.then((res) => {
          return {
            title: entry.title,
            key: entry.path,
            isLeaf: entry.isLeaf,
            icon: <img
              style={{width: 15, padding: 1}}
              src={icon} alt="-"
            />,
            children: res,
          }
        })
      }))
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

const getExpandedKeys = (path) => {
  const pathComponents = path.split("/").slice(1)
  //   ['a', 'b', 'c'].reduce(...).slice(1) === [ '/a', '/a/b', '/a/b/c' ]
  return pathComponents.reduce((acc, curr) => acc.concat([acc.at(-1) + '/' + curr]), ['']).slice(1)
}

class ContentTree extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      treeData: [],
      selectedKeys: [],
      expandedKeys: [],
    };
  }

  componentDidMount() {
    getNodeChildren("/")
      .then((data) => {
        const path = window.location.pathname
        let selectedKeys
        if (path.length > 1)
          selectedKeys = [path]
        else
          selectedKeys = []
        this.setState(state => { return {
          ...state,
          treeData: data,
          selectedKeys: selectedKeys,
          expandedKeys: getExpandedKeys(path),
        }})
      })
    const path = window.location.pathname
    this.props.selectContent(path)
    if (isTextFile(path))
      this.props.emitDataRequest(path)
  }

  onLoadData = treeNode => {
    return new Promise(resolve => {
      const path = treeNode.key
      getNodeChildren(path)
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

          this.setState(state => { return {
            ...state,
            treeData: treeData,
          }});
          resolve();
        })
    });
  };

  onSelect = (selectedKeys) => {
    this.setState(state => { return {
      ...state,
      selectedKeys: selectedKeys,
    }})
    for (const key of selectedKeys) {
			window.history.replaceState(null, null, '//' + document.location.host + key);
      const node = search(this.state.treeData, key)
      if (node.isLeaf)
        this.props.selectContent(key)
      if (isTextFile(key)) {
        this.props.clearContents()
        this.props.emitDataRequest(key)
      }
    }
  }

  onExpand = (expandedKeys) => {
    this.setState(state => { return {...state, expandedKeys} })
  }

  onMouseEnter = event => {
    if (event.node.isLeaf) {
      this.props.hoverContent(event.node.key)
      if (isTextFile(event.node.key)) {
        this.props.clearContents()
        this.props.emitDataRequest(event.node.key)
      }
    }
  }

  onMouseLeave = event => {
    if (event.node.isLeaf) {
      this.props.dehoverContent()
      this.props.clearContents()
      if (this.props.selectedContentPath !== null)
        this.props.emitDataRequest(this.props.selectedContentPath)
    }
  }

  render() {
    const switcherIcon = node => {
      if (node.isLeaf) {
        return null
      }
      if (node.expanded)
         return <img
           style={{width: 15, padding: 1, backgroundColor: 'white'}}
           src={arrowDown} alt="v"
         />
      else
         return <img
           style={{width: 15, padding: 1, backgroundColor: 'white'}}
           src={arrowRight} alt=">"
         />
    };
    return (
      <Tree
        onSelect={this.onSelect}
        loadData={this.onLoadData}
        treeData={this.state.treeData}
        defaultLoadedKeys={getExpandedKeys(window.location.pathname)}
        selectedKeys={this.state.selectedKeys}
        expandedKeys={this.state.expandedKeys}
        onExpand={this.onExpand}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        expandAction="click"
        switcherIcon={switcherIcon}
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
    if (this.textContentRef.current !== null) {
      hljs.highlightElement(this.textContentRef.current)
    }
  }

  render() {
    const path = this.props.shownContentPath
    if (path) {
      let asset_path = "//" + document.location.host + "/blob" + path;
      let asset_path_decoded = decodeURIComponent(asset_path);

      let highlight_js_dict = {
         txt: 'language-plaintext',
         yml: 'language-yaml',
         yaml: 'language-yaml',
      };

      let fileType = path.split('.').pop();
      if (fileType) {
        if (fileType === "mp4") {
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
        } else if (highlight_js_dict.hasOwnProperty(fileType)) {
          return (
            <div id='text-content' className="inherit-height text-content">
              <a href={asset_path} id='content-link'>source</a>
              <pre className='preformatted'>
                <code className={highlight_js_dict[fileType]} ref={this.textContentRef}>
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
      shownContentPath: null,
      textContent: "",
      textContentUuid: null,
    }

    this.socket = io()
    this.textDecoder = new TextDecoder();

    this.emitDataRequest = this.emitDataRequest.bind(this)
    this.clearContents = this.clearContents.bind(this)
  }

  componentWillUnmount() {
    this.socket.close()
  }

  clearContents() {
    this.setState(state => { return { ...state, textContent: ""} })
  }

  emitDataRequest(path) {
    if (isTextFile(path)) {
      const uuid = crypto.randomUUID()
      this.setState(state => {
        return {
          ...state,
          textContentUuid: uuid
        }
      })
      this.socket.on('data', (msg) => {
        if (msg.uuid === uuid) {
          const text = this.textDecoder.decode(msg.bytes)
          this.setState(state => {
            if (state.textContentUuid === uuid)
              return {
                ...state,
                textContent: this.state.textContent + text,
              }
            else
              return state
          })
        }
      })
      this.socket.emit("data request", {
        path: path,
        uuid: uuid,
      })
    }
  }

  selectContent(path) {
    this.setState(state => { return {
      ...state,
      selectedContentPath: path,
      shownContentPath: path,
    }})
  }

  hoverContent(path) {
    this.setState(state => { return {
      ...state,
      shownContentPath: path,
    }})
  }

  dehoverContent() {
    this.setState(state => { return {
      ...state,
      shownContentPath: this.state.selectedContentPath,
    }})
  }

  render() {
    return (
      <div>
        <div className="container">
          <div className="sidebar">
            <h1> Contents </h1>
            <ContentTree
              selectedContentPath={this.state.selectedContentPath}
              selectContent={path => this.selectContent(path)}
              hoverContent={path => this.hoverContent(path)}
              dehoverContent={_ => this.dehoverContent()}
              clearContents={this.clearContents}
              emitDataRequest={this.emitDataRequest}
            />
          </div>
          <div id="content" className="content">
            <Content
              shownContentPath={this.state.shownContentPath}
              textContent={this.state.textContent}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
