const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const prompt = require('electron-prompt');
const path = require('path');
const electronReload = require('electron-reload');

electronReload(__dirname);
const createWindow = () => {
    const win = new BrowserWindow({
      width: 840,
      height: 600,
      icon:path.join(__dirname,'./public/img/共享文件夹.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
        },
      // resizable: false,
      
      
    })
    win.loadFile('./index.html');
    // win.loadURL(`file://${path.join(__dirname,"./render/index.html#/login")}`)
    
}
  
ipcMain.on('dropped-file', (event, arg) => {
    console.log(arg, event);
  event.returnValue = `${arg.length}`;
  event.sender.startDrag
})
ipcMain.on('main-alert', (event, message) => {

  dialog.showMessageBoxSync({message:message})
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
  
app.whenReady().then(() => {
  ipcMain.handle('diglog:prompt', async () => {
    return await prompt({
      title: '请输入文件夹名',
      label: '文件夹名:',
      inputAttrs: {
        type: 'text',
        required:true,
      },
      buttonLabels: {
        ok: '确定',
        cancel:'取消'
      },
      type: 'input',
      alwaysOnTop:true,
    },)
  })
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})
  