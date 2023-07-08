if (module.hot) {
  module.hot.accept();
}
var Minio = require("minio");
const {
  createWriteStream,
  existsSync,
  mkdirSync,
  rm,
  createReadStream,
  stat,
  readdir,
  Stats,
  readdirSync,
  statSync,
  ReadStream,
} = require("fs");
const path = require("path");
const { shell, ipcRenderer } = require("electron");
const { fileType: fileTypeList } = require("./public/js/config.js");
let currentPage = "bucket";
let currentFragment = null;
let lastFragment = []; //文件列表栈
let isBackLoading = false;
const pathArray = []; //路径栈  第一个元素一般为buckname，后面的元素都是prefix
let downloadingArray = []; //下载中的所有文件
const fileUl = document.getElementById("ul"); //文件列表DOM
const backButton = document.getElementById("backButton");
const closeButtonOfDownloadList = document.querySelector(
  "#downloadList > .closeButton"
); //下载列表关闭按钮
const closeButtonOfUploadList = document.querySelector(
  "#uploadList > .closeButton"
); //上传列表关闭按钮
const downloadListDOM = document.getElementById("downloadList"); //下载列表 DOM
const downloadButtonDOM = document.getElementById("downloadButton"); //导航栏下载按钮
const uploadListDOM = document.getElementById("uploadList"); //上传列表 DOM
const uploadButtonDOM = document.getElementById("uploadButton"); //导航栏上传按钮
const folderAddButtonDOM = document.getElementById("buckAdd"); //新增文件夹按钮
const serverIpDOM = document.getElementById("serverIP"); //服务IP输入框
const serverPortDOM = document.getElementById("serverPort"); //服务端口输入框
const userNameDOM = document.getElementById("userName"); //用户名输入框
const passwordDOM = document.getElementById("password"); //密码输入框
const loginButtonDOM = document.querySelector(
  "#loginPage > #loginBox > .buttonBox > .sureButton"
); //登录按钮
const loginPageDOM = document.getElementById("loginPage"); //登录页面DOM
const filePageDOM = document.getElementById("filePage"); //文件页面DOM
downloadListDOM.style.display = "none";
uploadListDOM.style.display = "none";
//关闭下载列表
closeButtonOfDownloadList.onclick = () => {
  openOrCloseDownloadList("close");
};
closeButtonOfUploadList.onclick = () => {
  openOrCloseUploadList("close");
};
//关闭或打开下载列表
downloadButtonDOM.onclick = () => {
  openOrCloseDownloadList();
};
//关闭或打开上传列表
uploadButtonDOM.onclick = () => {
  openOrCloseUploadList();
};
//返回按钮单击事件
backButton.onclick = () => {
  if (isBackLoading) return;
  changeFileList();
};
document.querySelector("body").ondragover = (e) => {
  e.preventDefault();
  e.stopPropagation();
};
document.querySelector("body").ondrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  // 获得拖拽的文件集合
  var files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    whenOutFileDragIn(files);
  } else {
    //当内部文件拖拽的时候
  }

  // createReadStream(filePathList[0]).on('data', (data) => {
  //     console.dir(err);
  // });
};

folderAddButtonDOM.onclick = createFolder;

loginButtonDOM.onclick = () => {
  const userMessage = getUserMessage();
  const message = findWhichNotInput(userMessage);
  if (typeof message === "string") {
    alert(message);
    return;
  }
  console.log(s3Client);
  s3Client = new Minio.Client({
    endPoint: userMessage.serverIP,
    port: Number(userMessage.serverPort),
    useSSL: false,
    // accessKey: 'jxmtdzj',
    // secretKey:'root_mt_123'
    accessKey: userMessage.userName,
    secretKey: userMessage.password,
  });
  testLoginMessage(listBucket);
};
appendOnChangeEvent(serverIpDOM, (e) => {
  const value = e.target.value;
  localStorage.setItem("serverIP", value);
});
appendOnChangeEvent(serverPortDOM, (e) => {
  const value = e.target.value;
  localStorage.setItem("serverPort", value);
});
appendOnChangeEvent(userNameDOM, (e) => {
  const value = e.target.value;
  localStorage.setItem("userName", value);
});
appendOnChangeEvent(passwordDOM, (e) => {
  const value = e.target.value;
  localStorage.setItem("password", value);
});

/**
 * @type {Minio.Client|null}
 */
var s3Client = null;

init();

function init() {
  const userMessage = getUserMessage();

  s3Client = new Minio.Client({
    endPoint: userMessage.serverIP,
    port: Number(userMessage.serverPort),
    useSSL: false,
    accessKey: userMessage.userName,
    secretKey: userMessage.password,
  });
  testLocalstorageLoginMessage(listBucket);
}

/**
 * 初始化的时候用localstorage中的用户信息进行连接测试
 * @param {()=>void} callBack 测试通过调用的回调函数
 */
function testLocalstorageLoginMessage(callBack) {
  s3Client.listBuckets((e, buckets) => {
    if (e) {
      alert("登录失效");
      return jumpTo("login");
    }
    jumpTo("file");
    callBack();
  });
}

/**
 * 登录测试
 * @param {()=>void} callback 测试通过后调用的回调函数
 */
function testLoginMessage(callback) {
  s3Client.listBuckets((e, buckets) => {
    if (e) {
      const code = e.code;
      if (code === "ENOTFOUND" || code === "ETIMEDOUT") {
        localStorage.setItem("serverIP", null);
        alert("服务IP错误或者服务IP连接超时");
        return;
      }
      if (code === "ECONNREFUSED") {
        alert("服务端口错误");
        return;
      }
      if (code === "InvalidAccessKeyId" || code === "SignatureDoesNotMatch") {
        alert("用户名或密码错误");
        return;
      }
      alert("登录失败");
      return;
    }
    jumpTo("file");
    callback();
  });
}

/**
 * 页面跳转
 * @param {'login'|'file'} page
 */
function jumpTo(page) {
  if (page === "login") {
    loginPageDOM.style.display = "flex";
    filePageDOM.style.display = "none";
  }
  if (page === "file") {
    loginPageDOM.style.display = "none";
    filePageDOM.style.display = "block";
  }
}
/**
 * 获取用于登录的信息
 * @returns
 */
function getUserMessage() {
  const serverIP = localStorage.getItem("serverIP");
  const serverPort = localStorage.getItem("serverPort");
  const userName = localStorage.getItem("userName");
  const password = localStorage.getItem("password");
  return {
    serverIP,
    serverPort,
    userName,
    password,
  };
}

/**
 * 判断那个输入框没有填写
 * @param {{password:string,serverIP:string,userName:string,serverPort:string}} userMessage
 * @returns {string|true} 返回string表示没填的输入框，返回true表示全部都填写了
 */
function findWhichNotInput(userMessage) {
  if (!userMessage.serverIP?.trim()) {
    return "服务IP没有输入";
  }
  if (!userMessage.serverPort?.trim()) {
    return "服务端口没有输入";
  }
  if (!userMessage.userName?.trim()) {
    return "用户名没有输入";
  }
  if (!userMessage.password?.trim()) {
    return "密码没有填写";
  }

  return true;
}

/**
 * 重写window的alert方法
 * @param {string} message
 */
function alert(message) {
  console.log(message);
  ipcRenderer.send("main-alert", message);
}

/**
 * 添加onchange事件
 * @param {HTMLElement} DOM
 * @param {(event:Event)=>void} callback
 */
function appendOnChangeEvent(DOM, callback) {
  DOM.onchange = (e) => {
    callback(e);
  };
}

/**
 * 列出所有的桶
 */
function listBucket() {
  s3Client.listBuckets(function (e, buckets) {
    if (e) console.dir(e);
    const fragment = document.createElement("div");
    buckets.forEach((item) => {
      const li = createFileLi(item.name);
      li.ondblclick = () => {
        pushToPathStack(item.name);
        entryBuckets(item.name + "");
      };
      appendChild(fragment, li);
    });
    changeFileList(fragment);
  });
}

/**
 * 当外部文件拖拽进来的时候
 * @param {Array<File>} files
 * @returns
 */
function whenOutFileDragIn(files) {
  const filePathList = files.map((item) => item.path);
  if (pathArray.length < 1) {
    alert("此处为根目录，无法上传文件，请先创建一个根目录文件夹，然后上传文件");
    return;
  }
  const isSure = confirm("是否上传以下文件\n" + filePathList.join("\n"));
  if (!isSure) return;
  openOrCloseUploadList("open");
  files.forEach((item) => {
    stat(item.path, (err, statObj) => {
      if (err) console.log(err);
      if (statObj.isFile()) {
        fileUpload(item);
      }
      if (statObj.isDirectory()) {
        folderUpload(item);
      }
    });
  });
}

/**
 * 新增文件夹
 */
async function createFolder() {
  console.log(pathArray);
  const path = await ipcRenderer.invoke("diglog:prompt");
  if (!path) return;
  if (pathArray.length === 0) {
    //创建桶
    createBucket(path);
  } else {
    //创建文件夹
    createObjectFolder(path);
  }
}
/**
 * 在桶里面创建文件夹
 * @param {string} folderName
 */
function createObjectFolder(folderName) {
  pushToPathStack(folderName + "/");
  changeFileUL();
  alert(
    "注意：\n请尽快上传文件，如果不上传文件，这个文件夹会被自动销毁\n这和开源文件服务有关，改不了"
  );
}
/**
 * 创建桶
 * @param {string} bucketName
 */
function createBucket(bucketName) {
  s3Client
    .makeBucket(bucketName)
    .then((value) => {
      listBucket();
      alert("创建文件夹成功");
    })
    .catch((err) => {
      alert(
        "创建失败\n根目录下的文件夹名只能是小写字母\n不支持中文\n这是开源文件服务的原因，无法更改，请见谅"
      );
    });
}
/**
 * 关闭或开启上传列表
 * @param {'close'|'open'|null} type 'close'|'open'|null
 */
function openOrCloseUploadList(type) {
  if (type) {
    if (type === "open") {
      uploadListDOM.style.display = "block";
      openOrCloseDownloadList("close");
    }
    if (type === "close") {
      uploadListDOM.style.display = "none";
    }
  } else {
    const displayStr = uploadListDOM.style.display;
    if (displayStr === "none") {
      uploadListDOM.style.display = "block";
      openOrCloseDownloadList("close");
    } else {
      uploadListDOM.style.display = "none";
    }
  }
}
/**
 * 关闭或开启下载列表
 * @param {'close'|'open'|null} type 'close'|'open'|null
 */
function openOrCloseDownloadList(type) {
  if (type) {
    if (type === "open") {
      downloadListDOM.style.display = "block";
      openOrCloseUploadList("close");
    }
    if (type === "close") {
      downloadListDOM.style.display = "none";
    }
  } else {
    const displayStr = downloadListDOM.style.display;
    if (displayStr === "none") {
      downloadListDOM.style.display = "block";
      openOrCloseUploadList("close");
    } else {
      downloadListDOM.style.display = "none";
    }
  }
}
/**
 * 进入文件夹
 * @param {HTMLElement} fragment
 */
function entryFileList(fragment) {
  if (currentFragment) {
    fileUl.removeChild(currentFragment);
  }
  currentFragment = fragment;
  appendChild(fileUl, currentFragment);
}
/**
 * 根据pathArray调用列表方法
 */
function changeFileUL() {
  if (pathArray.length === 0) {
    listBucket();
  } else if (pathArray.length === 1) {
    entryBuckets(pathArray[0]);
  } else {
    entryObjectFolder();
  }
}
/**
 * 从文件夹中返回
 */
function backFileList() {
  isBackLoading = true;
  //   const fragment = lastFragment.pop();
  //   currentFragment.isNotInFragmentStack = true;
  //   console.log(currentFragment);
  //   fileUl.removeChild(currentFragment);
  //   currentFragment = fragment;
  //   appendChild(fileUl, currentFragment);
  popFromPathStack();
  changeFileUL();
  setTimeout(() => {
    isBackLoading = false;
  }, 500);
}
/**
 * 更改文件列表
 * @param {HTMLElement} fragment
 */
function changeFileList(fragment) {
  if (fragment) {
    entryFileList(fragment);
  } else {
    backFileList();
  }
  if (pathArray.length > 0) {
    backButton.style.display = "block";
  } else {
    backButton.style.display = "none";
  }
}
/**
 * 创建文件li标签
 * @param {string} fileName
 * @param {string} fileType
 * @returns {HTMLLIElement}
 */
function createFileLi(fileName, fileType) {
  const li = document.createElement("li");
  // const nameNode = document.createTextNode(fileName);
  li.draggable = true;
  const nameNode = document.createElement("span");
  nameNode.innerText = fileName;
  nameNode.title = fileName;
  const divFileIcon = document.createElement("div");
  if (fileType)
    divFileIcon.classList.add(
      fileTypeList.includes(fileType) ? fileType : "unknown"
    );
  appendChild(li, [divFileIcon, nameNode]);
  return li;
}
/**
 * 给元素添加子元素
 * @param {HTMLElement} parentElement
 * @param {Array<HTMLElement>|HTMLElement} childElement
 */
function appendChild(parentElement, childElement) {
  if (Array.isArray(childElement)) {
    childElement.forEach((item) => {
      parentElement.appendChild(item);
    });
  } else {
    parentElement.appendChild(childElement);
  }
}
/**
 * 改变文件路径显示
 */
function changeFilePathDisplay() {
  const filePathDOM = document.getElementById("filePath");
  if (pathArray.length > 0) {
    const pathCopyArray = [...pathArray];
    pathCopyArray[0] = pathCopyArray[0] + "/";
    const text =
      pathCopyArray.length > 1
        ? pathCopyArray[0] + pathCopyArray[pathCopyArray.length - 1]
        : pathCopyArray[0];
    filePathDOM.innerText = text;
    filePathDOM.style.display = "block";
  } else {
    filePathDOM.innerText = "";
    filePathDOM.style.display = "none";
  }
}
/**
 * 推入路径栈
 * @param {string} folderName
 */
function pushToPathStack(folderName) {
  pathArray.push(folderName + "");
  changeFilePathDisplay();
}
/**
 * 弹出路径栈
 */
function popFromPathStack() {
  pathArray.pop();
  changeFilePathDisplay();
}
/**
 * 发送Windows消息通知
 * @param {string} title
 * @param {string} body
 */
function messageNotify(title, body) {
  new window.Notification(title, { body: body });
}
/**
 * 创建文件下载列表中的li
 * @param {string} fileName 文件名或文件夹名
 * @returns
 */
function createDownloadListLi(fileName) {
  const li = document.createElement("li");
  const title = document.createElement("div");
  title.classList.add("downloadListTitle");
  title.innerText = fileName;
  title.title = fileName;
  const progressStrip = document.createElement("div");
  progressStrip.classList.add("downloadProgressStrip");
  const compeletProgressStrip = document.createElement("div");
  compeletProgressStrip.classList.add("completeStrip");
  const completeRate = document.createElement("div");
  completeRate.classList.add("completeRate");
  completeRate.innerText = "0%";
  const iconBox = document.createElement("div");
  iconBox.classList.add("downloadListIconBox");
  const stopButton = document.createElement("div");
  stopButton.classList.add("stopButton");
  stopButton.title = "暂停";
  const startButton = document.createElement("div");
  startButton.classList.add("startButton");
  startButton.title = "开始";
  const deleteButton = document.createElement("div");
  deleteButton.classList.add("deleteButton");
  deleteButton.title = "删除";
  const openFolder = document.createElement("div");
  openFolder.classList.add("openFolderButton");
  openFolder.title = "打开文件";
  appendChild(iconBox, [stopButton, startButton, deleteButton, openFolder]);
  appendChild(progressStrip, compeletProgressStrip);
  appendChild(li, [title, progressStrip, completeRate, iconBox]);
  return {
    li,
    compeletProgressStrip,
    completeRate,
    iconBox,
    stopButton,
    startButton,
    deleteButton,
    openFolderButton: openFolder,
  };
}
/**
 * 创建一个文件的下载的路径
 * 因文件会重名，所以需要加时间戳
 * @param {string} fileName
 * @returns {string} 创建好的文件路径
 */
function createDownloadFilePath(fileName) {
  let downloadFilePath = "C:/Users/PC/Downloads/" + fileName;
  const currentData = new Date();
  //检查是否存在shareFolder文件夹，如果存在，则啥事也不干，如果不存在，则创建一个
  existsSync(
    "C:/Users/PC/Downloads/" +
      "sharedFolder/" +
      currentData.toLocaleDateString().replace("/", "-").replace("/", "-")
  )
    ? ""
    : mkdirSync(
        "C:/Users/PC/Downloads/" +
          "sharedFolder/" +
          currentData.toLocaleDateString().replace("/", "-").replace("/", "-")
      );
  //创建一个文件名
  downloadFilePath =
    "C:/Users/PC/Downloads/" +
    "sharedFolder/" +
    currentData.toLocaleDateString().replace("/", "-").replace("/", "-") +
    "/" +
    currentData.toLocaleTimeString().replace(":", "-").replace(":", "-") +
    "-" +
    fileName;
  return downloadFilePath;
}
/**
 * 改变文件下载进度条和进度显示
 * @param {HTMLElement} progressStripDOM
 * @param {HTMLElement} progressRateDOM
 * @param {number} rate
 */
function changeFileDownloadList(progressStripDOM, progressRateDOM, rate) {
  progressStripDOM.style.width = rate + "%";
  progressRateDOM.innerText = rate + "%";
}

// function iternalUploadFile(){

// }

// /**
//  * 每次上传两个文件
//  * @param {Array<{path:string,name:string,size:number}>} fileList
//  */
// function fileListUpload(fileList) {

// }

/**
 * 文件夹上传
 * @param {File} folder
 */
function folderUpload(folder) {
  const fileList = [];
  iternalFolder({ vPath: folder.name, tPath: folder.path }, (filePathObj) => {
    fileList.push(filePathObj);
  });
  const transferFileList = fileList.map((item) => {
    return {
      path: item.tPath,
      name: item.vPath,
      size: item.size,
    };
  });
  let totalSize = 0;
  transferFileList.forEach(item => {
    totalSize += item.size;
  })
  const liAndOtherDom = createUploadLiAndAppendToUploadUL(folder.name);
  const currentPathArray = [...pathArray];
  let uploadSize = 0;
  const bucketName = pathArray[0];
  /**
   * @type {ReadStream|null}
   */
  let stream = null;
  let isComplete = false;
  liAndOtherDom.openFolderButton.onclick = () => {
    const isSure = confirm("是否打开本地文件？");
    if (isSure) {
      // shell.openPath(file.path);
    }
  };
  liAndOtherDom.stopButton.onclick = () => {
    stream.pause();
    liAndOtherDom.stopButton.style.display = "none";
    liAndOtherDom.startButton.style.display = "block";
  };
  liAndOtherDom.startButton.onclick = () => {
    stream.resume();
    liAndOtherDom.stopButton.style.display = "block";
    liAndOtherDom.startButton.style.display = "none";
  };
  liAndOtherDom.deleteButton.onclick = () => {
    const isSure = confirm("是否要将共享文件夹中的该文件删除？");
    if (isSure) {
      stream.destroy();
      const removeObject = isComplete
        ? s3Client.removeObject
        : s3Client.removeIncompleteUpload;
      liAndOtherDom.li.parentElement.removeChild(liAndOtherDom.li);
      // downloadingArray = downloadingArray.filter(item => item !== downloadObject);
      //TODO:文件删除需要重新做
      removeObject.call(s3Client, bucketName, objectName, () => {
        if (isJumpToOtherFolder(currentPathArray)) {
          changeFileUL();
        }
        messageNotify(
          "删除文件成功",
          "删除共享文件夹中该文件" + objectName + "成功"
        );
      });
    }
  };
  function oneByOneUploadFile(transferFileList) {
    fileUploadFromFolder(transferFileList.pop()).then(() => {
      if (transferFileList.length > 0) {
        oneByOneUploadFile(transferFileList);
      } else {
        //如果在还在原来的页面就刷新页面，如果不在，就当啥事没有
        let isNotJumpToOtherFolder = isJumpToOtherFolder(currentPathArray);
        if (isNotJumpToOtherFolder) {
          changeFileUL();
          // refreshFragment(uploadFileFragment, fileObj);
        }
        isComplete = true;
        changeFileDownloadList(
          liAndOtherDom.compeletProgressStrip,
          liAndOtherDom.completeRate,
          100
        );
        liAndOtherDom.openFolderButton.style.display = "block";
        liAndOtherDom.startButton.style.display = "none";
        liAndOtherDom.stopButton.style.display = "none";
        messageNotify("上传完成", folder.name + "上传完成");
        return true;
      }
    });
  }
  function fileUploadFromFolder(file) {
    stream = createReadStream(file.path).on("data", (data) => {
      uploadSize += data.length;
      let rate = parseFloat((uploadSize / totalSize) * 100).toFixed(2);
      if (rate == 100) {
        rate = 99;
      }
      changeFileDownloadList(
        liAndOtherDom.compeletProgressStrip,
        liAndOtherDom.completeRate,
        rate
      );
    });
    return s3Client
      .putObject(bucketName, file.name, stream)
      .then((value) => {
        //TODO:这里后面需要还原回去
      })
      .catch((err) => {
        console.log(err);
      });
  }
  oneByOneUploadFile(transferFileList);
}

/**
 * 递归获取文件夹下文件路径
 * @param {{vPath:string,tPath:string}} folder
 * @param {({vPath:string,tPath:string,size:number},dirent:Stats)=>void} callBack
 */
function iternalFolder(folder, callBack) {
  const fileList = readdirSync(folder.tPath, { withFileTypes: true });
  const folderList = [];
  for (let i = 0; i < fileList.length; i++) {
    let dirent = fileList[i];
    const filePath = path.join(folder.tPath, dirent.name);
    const fileVisualPath = folder.vPath + "/" + dirent.name; //获取虚拟file path
    const fileStat = statSync(filePath);
    if (dirent.isFile()) {
      callBack({ tPath: filePath, vPath: fileVisualPath, size: fileStat.size });
    } else if (dirent.isDirectory()) {
      folderList.push({ vPath: fileVisualPath, tPath: filePath });
    }
  }
  for (let i = 0; i < folderList.length; i++) {
    iternalFolder(folderList[i], callBack);
  }
}

/**
 * 是否跳转到其他页面了
 * @param {Array<string>} currentPathArray 当前页面的路径栈
 * @returns {boolean} true表示没有跳转，false表示跳转了
 */
function isJumpToOtherFolder(currentPathArray) {
  console.log(currentPathArray);
  let isNotJumpToOtherFolder = currentPathArray.length === pathArray.length;
  if (isNotJumpToOtherFolder) {
    for (let i = 0; i < currentPathArray.length; i++) {
      if (currentPathArray[i] !== pathArray[i]) {
        isNotJumpToOtherFolder = false;
        break;
      }
    }
  }
  return isNotJumpToOtherFolder;
}
/**
 * 给上传列表添加一个子元素
 * @param {object} liAndOtherDom
 */
function appendChildToUploadUL(liAndOtherDom) {
  document
    .querySelector("#uploadList > #downloadFileList > div")
    ?.appendChild(liAndOtherDom.li);
  const fileListBox = document.querySelector(
    "#uploadList > #downloadFileList > div"
  );
  fileListBox.insertBefore(liAndOtherDom.li, fileListBox.children[0]);
}
/**
 * 创建上传列表li并插入上传列表ul
 * @param {string} fileName
 */
function createUploadLiAndAppendToUploadUL(fileName) {
  const liAndOtherDom = createDownloadListLi(fileName);
  appendChildToUploadUL(liAndOtherDom);
  return liAndOtherDom;
}

/**
 * 文件上传
 * @param {File} file
 */
function fileUpload(file) {
  const currentPathArray = [...pathArray];
  let uploadSize = 0;
  let isComplete = false;
  const fileName = file.name;
  const bucketName = pathArray[0];
  const objectName =
    pathArray.length > 1
      ? pathArray[pathArray.length - 1] + fileName
      : "" + fileName;

  const liAndOtherDom = createUploadLiAndAppendToUploadUL(fileName);

  const stream = createReadStream(file.path).on("data", (data) => {
    uploadSize += data.length;
    let rate = parseFloat((uploadSize / file.size) * 100).toFixed(2);
    if (rate == 100) {
      rate = 99;
    }
    changeFileDownloadList(
      liAndOtherDom.compeletProgressStrip,
      liAndOtherDom.completeRate,
      rate
    );
  });

  liAndOtherDom.openFolderButton.onclick = () => {
    const isSure = confirm("是否打开本地文件？");
    if (isSure) {
      shell.openPath(file.path);
    }
  };
  liAndOtherDom.stopButton.onclick = () => {
    stream.pause();
    liAndOtherDom.stopButton.style.display = "none";
    liAndOtherDom.startButton.style.display = "block";
  };
  liAndOtherDom.startButton.onclick = () => {
    stream.resume();
    liAndOtherDom.stopButton.style.display = "block";
    liAndOtherDom.startButton.style.display = "none";
  };
  liAndOtherDom.deleteButton.onclick = () => {
    const isSure = confirm("是否要将共享文件夹中的该文件删除？");
    if (isSure) {
      stream.destroy();
      const removeObject = isComplete
        ? s3Client.removeObject
        : s3Client.removeIncompleteUpload;
      liAndOtherDom.li.parentElement.removeChild(liAndOtherDom.li);
      // downloadingArray = downloadingArray.filter(item => item !== downloadObject);
      removeObject.call(s3Client, bucketName, objectName, () => {
        if (isJumpToOtherFolder(currentPathArray)) {
          changeFileUL();
        }
        messageNotify(
          "删除文件成功",
          "删除共享文件夹中该文件" + objectName + "成功"
        );
      });
    }
  };
  return s3Client
    .putObject(bucketName, objectName, stream)
    .then((value) => {
      //如果在还在原来的页面就刷新页面，如果不在，就当啥事没有
      let isNotJumpToOtherFolder = isJumpToOtherFolder(currentPathArray);
      if (isNotJumpToOtherFolder) {
        changeFileUL();
        // refreshFragment(uploadFileFragment, fileObj);
      }
      isComplete = true;
      changeFileDownloadList(
        liAndOtherDom.compeletProgressStrip,
        liAndOtherDom.completeRate,
        100
      );
      liAndOtherDom.openFolderButton.style.display = "block";
      liAndOtherDom.startButton.style.display = "none";
      liAndOtherDom.stopButton.style.display = "none";
      messageNotify("上传完成", fileName + "上传完成");
    })
    .catch((err) => {
      console.log(err);
    });
}
/**
 * 文件下载
 * @param {string} fileName
 * @param {Minio.BucketItem} fileMessage
 */
function downloadFile(fileName, fileMessage) {
  const prefixFileName =
    pathArray.length > 1
      ? pathArray[pathArray.length - 1] + fileName
      : fileName;
  s3Client.getObject(pathArray[0], prefixFileName, (err, stream) => {
    console.dir(stream);
    const liAndOtherDom = createDownloadListLi(fileName);
    const downloadObject = {
      downloadedSize: 0, //已经下载的字节数
      size: fileMessage.size, //总字节数
      downloadFileLoaction: "", //文件在本地的位置
      isComplete: false, //是否下载完成
    };
    document
      .querySelector("#downloadList > #downloadFileList > div")
      ?.appendChild(liAndOtherDom.li);
    const fileListBox = document.querySelector(
      "#downloadList > #downloadFileList > div"
    );
    fileListBox.insertBefore(liAndOtherDom.li, fileListBox.children[0]);
    openOrCloseDownloadList("open");

    let downloadFilePath = createDownloadFilePath(fileName);
    downloadObject.downloadFileLoaction = downloadFilePath;

    liAndOtherDom.openFolderButton.onclick = () => {
      const isSure = confirm("是否打开文件");
      if (isSure) {
        shell.openPath(downloadFilePath);
      }
    };
    liAndOtherDom.stopButton.onclick = () => {
      stream.pause();
      liAndOtherDom.stopButton.style.display = "none";
      liAndOtherDom.startButton.style.display = "block";
      console.log("关闭下载", downloadObject);
    };
    liAndOtherDom.startButton.onclick = () => {
      stream.resume();
      liAndOtherDom.stopButton.style.display = "block";
      liAndOtherDom.startButton.style.display = "none";
    };
    liAndOtherDom.deleteButton.onclick = () => {
      const isSure = confirm("是否要删除该文件");
      if (isSure) {
        stream.destroy();
        // rm(downloadFilePath, (err) => {
        //     if (err) messageNotify('删除失败', '删除' + downloadFilePath + '文件失败');
        //     messageNotify('删除成功', '删除' + downloadFilePath + '文件成功');
        // });
        liAndOtherDom.li.parentElement.removeChild(liAndOtherDom.li);
        downloadingArray = downloadingArray.filter(
          (item) => item !== downloadObject
        );
      }
    };

    stream
      .on("data", (data) => {
        downloadObject.downloadedSize =
          downloadObject.downloadedSize + data.length;
        const progressStrip = parseFloat(
          (downloadObject.downloadedSize / fileMessage.size) * 100
        ).toFixed(2);
        changeFileDownloadList(
          liAndOtherDom.compeletProgressStrip,
          liAndOtherDom.completeRate,
          progressStrip
        );
      })
      .pipe(createWriteStream(downloadFilePath))
      .on("close", (res) => {
        changeFileDownloadList(
          liAndOtherDom.compeletProgressStrip,
          liAndOtherDom.completeRate,
          100
        );
        downloadObject.isComplete = true;
        liAndOtherDom.openFolderButton.style.display = "block";
        liAndOtherDom.startButton.style.display = "none";
        liAndOtherDom.stopButton.style.display = "none";
        console.log(downloadObject);
        messageNotify("下载完成", fileName + "下载完成");
      });
    //推入 下载列表
    downloadingArray.push(downloadObject);
  });
}
/**
 * 清空fragment中的列表
 * @param {HTMLElement} fragment
 */
function cleanFragment(fragment) {
  const list = Array.from(fragment.childNodes);
  //需要从尾部清除到头部，不然会导致清理不掉
  for (let i = list.length - 1; i >= 0; i--) {
    fragment.removeChild(list[i]);
  }
}
/**
 * 刷新在lastFragment中的fragment
 * @param {HTMLElement} fragment
 * @param {{name:string,size:number}} fileObj
 */
function refreshFragment(fragment, fileObj) {
  const data = fileObj;
  console.log(data);
  let fileName = data.name ? data.name : "";
  if (data.prefix) {
    const prefixArray = data.prefix.split("/");
    fileName = prefixArray[prefixArray.length - 2];
  }
  const fileNameSplitArray = fileName.split(".");
  let fileType = data.name ? "unknown" : "";
  fileType =
    fileNameSplitArray.length > 1
      ? fileNameSplitArray[fileNameSplitArray.length - 1]
      : fileType;
  const fileNameSplitBySlash = fileName.split("/");
  fileName =
    fileNameSplitBySlash.length > 1
      ? fileNameSplitBySlash[fileNameSplitBySlash.length - 1]
      : fileName;
  const li = createFileLi(fileName, fileType);
  if (!data.prefix) {
    li.ondblclick = () => {
      downloadFile(fileName, data);
    };
  } else {
    li.ondblclick = () => {
      pushToPathStack(data.prefix);
      entryObjectFolder();
    };
  }
  appendChild(fragment, li);
}
function entryBuckets(bucketName) {
  const stream = s3Client.listObjectsV2(bucketName, "", false);
  const fragment = document.createElement("div");

  stream.on("data", (data) => {
    console.log(data);
    const fileName = data.name ? data.name : data.prefix.replace("/", "");
    const fileNameSplitArray = fileName.split(".");
    let fileType = data.name ? "unknown" : "";
    fileType =
      fileNameSplitArray.length > 1
        ? fileNameSplitArray[fileNameSplitArray.length - 1]
        : fileType;
    const li = createFileLi(fileName, fileType);
    if (!data.prefix) {
      li.ondblclick = () => {
        console.log(data.etag);
        downloadFile(fileName, data);
      };
    } else {
      li.ondblclick = () => {
        pushToPathStack(data.prefix);
        entryObjectFolder();
      };
    }
    appendChild(fragment, li);
  });
  stream.on("error", (err) => {});
  stream.on("end", () => {
    changeFileList(fragment);
  });
}

function entryObjectFolder() {
  const bucketName = pathArray[0];
  const prefix = pathArray[pathArray.length - 1];
  const fragment = document.createElement("div");
  console.log(bucketName, prefix);
  const stream = s3Client.listObjects(bucketName, prefix, false);
  stream.on("data", (data) => {
    console.log(data);
    let fileName = data.name ? data.name : "";
    if (data.prefix) {
      const prefixArray = data.prefix.split("/");
      fileName = prefixArray[prefixArray.length - 2];
    }
    const fileNameSplitArray = fileName.split(".");
    let fileType = data.name ? "unknown" : "";
    fileType =
      fileNameSplitArray.length > 1
        ? fileNameSplitArray[fileNameSplitArray.length - 1]
        : fileType;
    const fileNameSplitBySlash = fileName.split("/");
    fileName =
      fileNameSplitBySlash.length > 1
        ? fileNameSplitBySlash[fileNameSplitBySlash.length - 1]
        : fileName;
    const li = createFileLi(fileName, fileType);
    if (!data.prefix) {
      li.ondblclick = () => {
        downloadFile(fileName, data);
      };
    } else {
      li.ondblclick = () => {
        pushToPathStack(data.prefix);
        entryObjectFolder();
      };
    }
    appendChild(fragment, li);
  });
  stream.on("error", (err) => {});
  stream.on("end", () => {
    changeFileList(fragment);
  });
}
