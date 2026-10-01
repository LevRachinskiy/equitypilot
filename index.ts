import {createApp} from './app.js';
import express from 'express';
import {resolve} from 'node:path';
const {app,store}=createApp();
app.use(express.static(resolve('dist')));
app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log(JSON.stringify({event:'server.ready',port:Number(process.env.PORT||3001)})));
const shutdown=()=>server.close(()=>{store.close();process.exit(0)});
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
