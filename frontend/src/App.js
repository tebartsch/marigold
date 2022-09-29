import React from 'react';
import Tree from 'rc-tree';
import "rc-tree/assets/index.css"
import highlight from "highlight.js";
import "highlight.js/styles/default.css"
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

import './App.css';
import arrowDown from './themes/default/arrow-down-s-line.svg'
import arrowRight from './themes/default/arrow-right-s-line.svg'
import folderIcon from './themes/default/folder.svg'
import fileIcon from './themes/default/file.svg'
import fileTextIcon from './themes/default/file-text.svg'
import imageIcon from './themes/default/image.svg'
import videoIcon from './themes/default/video.svg'


const axios = require('axios').default;

const iconsPerExtension = {
    "txt": fileTextIcon,
    "yml": fileTextIcon,
    "yaml": fileTextIcon,
    "jpg": imageIcon,
    "jpeg": imageIcon,
    "png": imageIcon,
    "mp4": videoIcon,
    "svg": imageIcon,
    "html": imageIcon,
};


const isTextFile = (path) => {
  if (path !== null) {
    const textFileExtensions = ["txt", "yml", "yaml"]
    const ext = path.split(".").pop()
    return textFileExtensions.includes(ext)
  } else {
    return false
  }
}


const getNodeChildren = async (path) =>
  axios
    .get('/api/children' + path)
    .then((res) => {
       const rcTreeData = res.data.map(entry => {
        const ext = entry.path.split(".").pop()
        let icon
        if (!entry.isLeaf)
          icon = folderIcon
        else if (iconsPerExtension.hasOwnProperty(ext)) {
          icon = iconsPerExtension[ext]
        } else
          icon = fileIcon
        return {
          title: entry.title,
          key: entry.path,
          isLeaf: entry.isLeaf,
          icon: <img
            style={{width: 15, padding: 1}}
            src={icon} alt="-"
          />,
        }
      })

      // Sort by name descending
      rcTreeData.sort((entry1, entry2) => {
        if (!entry1.isLeaf && entry2.isLeaf)
          return -1
        else if (entry1.isLeaf && !entry2.isLeaf)
          return 1
        else {
          if (entry1.title > entry2.title) return -1
          if (entry1.title < entry2.title) return 1
          return 0;
        }
      })

      return rcTreeData
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
    this.setState(state => {
      return {
        ...state,
        selectedKeys: selectedKeys,
      }
    })
    if (!selectedKeys.length)
      this.props.selectContent(null)
    else {
      for (const key of selectedKeys) {
        window.history.replaceState(null, null, '//' + document.location.host + key);
        const node = search(this.state.treeData, key)
        if (node.isLeaf) {
          this.props.selectContent(key)
        }
      }
    }
  }

  onExpand = (expandedKeys) => {
    this.setState(state => { return {...state, expandedKeys} })
  }

  onMouseEnter = event => {
    if (event.node.isLeaf) {
      this.props.hoverContent(event.node.key)
    }
  }

  onMouseLeave = event => {
    if (event.node.isLeaf) {
      this.props.dehoverContent()
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

const Content = (props) => {
  const [scrollHeight, setScrollHeight] = React.useState(0)

  const preElementRef = React.useCallback((node) => {
    if (node !== null) {
      if (node.scrollTop + node.offsetHeight + 5 >= scrollHeight)
        node.scrollTop = node.scrollHeight
      setScrollHeight(node.scrollHeight)
    }
  },
    /* We want to highlight the text in the code element every time the text content is changed*/
    /* eslint-disable-next-line */
    [props.textContent]
  )

  const codeElementRef = React.useCallback((node) => {
    if (node !== null) {
      highlight.highlightElement(node)
    }
  },
    /* We want to highlight the text in the code element every time the text content is changed*/
    /* eslint-disable-next-line */
    [props.textContent]
  )

  const path = props.shownContentPath
  if (path) {
    let asset_path = "/api/blob" + path;
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
          <div className="column-flex">
            <a href={asset_path}>source</a>
            <pre className='preformatted' ref={preElementRef}>
              <code
                className={highlight_js_dict[fileType]}
                style={{minWidth: "fit-content"}}
                ref={codeElementRef}
              >
                {props.textContent}
              </code>
            </pre>
          </div>
        );
      } else if (fileType === "svg" || fileType === "html") {
        return (
          <div className="column-flex">
            <a href={asset_path}>source</a>
            <iframe
              title={asset_path_decoded} className='image' src={asset_path}
              style={{ marginTop: "10px", marginBottom: "10px", border: 0,
                       width: "100%", height: "100%"}}
            />
          </div>
        );
      } else {
        return (
          <div className="image-container">
            <a href={asset_path}>
              <img className='image' src={asset_path} alt={asset_path_decoded}/>
            </a>
          </div>
        );
      }
    }
  } else {
    return null
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedContentPath: null,
      shownContentPath: null,
      textContent: "",
      sidebarIsResizing: false,
      sidebarWidth: null
    }
    this.textContentUuid = null

    this.textDecoder = new TextDecoder();

    this.startResizing = this.startResizing.bind(this)
    this.stopResizing = this.stopResizing.bind(this)
    this.resize = this.resize.bind(this)
    this.emitDataRequest = this.emitDataRequest.bind(this)
    this.selectContent = this.selectContent.bind(this)
    this.hoverContent = this.hoverContent.bind(this)
    this.dehoverContent = this.dehoverContent.bind(this)

    this.sidebarRef = React.createRef();

    this.socket = io()
  }

  componentDidMount() {
    const sidebarWidth = this.sidebarRef.current.offsetWidth
    this.setState(state => { return { ...state, sidebarWidth} })
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener("mousemove", this.resize);
    window.addEventListener("mouseup", this.stopResizing);
  }

  componentWillUnmount() {
    window.removeEventListener("mousemove", this.resize);
    window.removeEventListener("mouseup", this.stopResizing);
  }

  startResizing(mouseDownEvent) {
    this.setState(state => { return { ...state, sidebarIsResizing: true} })
  }

  stopResizing(mouseDownEvent) {
    this.setState(state => { return { ...state, sidebarIsResizing: false} })
  }

  resize(mouseMoveEvent) {
    if (this.state.sidebarIsResizing) {
      const sidebarWidth = mouseMoveEvent.clientX -
        this.sidebarRef.current.getBoundingClientRect().left
      this.setState(state => { return { ...state, sidebarWidth} })
    }
  }

  emitDataRequest(path) {
    const uuid = uuidv4()
    this.textContentUuid = uuid
    this.socket.on('data', (msg) => {
      if (msg.uuid === uuid) {
        const text = this.textDecoder.decode(msg.bytes)
        if (this.textContentUuid === uuid)
          this.setState(state => {
            return {
              ...state,
              textContent: this.state.textContent + text,
            }
          })
      }
    })
    this.socket.emit("data request", {
        path: path,
        uuid: uuid,
      })
  }

  selectContent(path) {
    this.setState(state => { return {
      ...state,
      selectedContentPath: path,
      shownContentPath: state.shownContentPath || path,
      textContent: path ? '' : state.textContent,
    }})
    if (isTextFile(path)) {
      this.emitDataRequest(path)
    }
  }

  hoverContent(path) {
    this.setState(state => { return {
      ...state,
      shownContentPath: path,
      textContent: '',
    }})
    if (isTextFile(path)) {
      this.emitDataRequest(path)
    }
  }

  dehoverContent() {
    this.setState(state => { return {
      ...state,
      shownContentPath: this.state.selectedContentPath,
      textContent: '',
    }})
    if (isTextFile(this.state.selectedContentPath)) {
      this.emitDataRequest(this.state.selectedContentPath)
    }
  }

  render() {
    return (
      <div className="app">
        <div
          ref={this.sidebarRef}
          className="sidebar"
          style={{width: this.state.sidebarWidth}}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="sidebar-content">
            <h1> Contents </h1>
            <ContentTree
              selectedContentPath={this.state.selectedContentPath}
              selectContent={path => this.selectContent(path)}
              hoverContent={path => this.hoverContent(path)}
              dehoverContent={this.dehoverContent}
            />
          </div>
          <div className="sidebar-resizer" onMouseDown={this.startResizing}></div>
        </div>
        <div className="content">
          <Content
            shownContentPath={this.state.shownContentPath}
            textContent={this.state.textContent}
          />
        </div>
      </div>
    )
  }
}

export default App;
