const {readdir,readFile,mkdir,writeFile}=require('node:fs/promises');
const {join}=require('node:path');

async function main(){
const rootIn=process.argv[2]||'/input', rootOut=process.argv[3]||'/output';
for(const id of await readdir(rootIn)){
  const dir=join(rootIn,id);
  let p:Uint8Array, input:Uint8Array;
  try { [p,input]=await Promise.all([readFile(join(dir,'program.bin')),readFile(join(dir,'input.bin'))]); } catch { continue; }
  const d=new Int32Array(256), c=new Int32Array(64), m=new Int32Array(256), out:number[]=[];
  let s=0,cs=0,ip=0,pc=0,steps=0,exit=0;
  const trap=(n:number)=>{exit=n;return true;};
  for(;;){
    if(steps===1e6){trap(10);break} if(pc<0||pc>=p.length){trap(9);break}
    const op=p[pc];
    const imm=op===1?1:op===2?4:op>=0x30&&op<=0x33?2:0;
    if(![0,1,2,3,4,5,6,7,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1a,0x1b,0x1c,0x1d,0x1e,0x20,0x21,0x22,0x30,0x31,0x32,0x33,0x34,0x40,0x41,0x50,0x51,0x52,0x53].includes(op)){trap(5);break}
    if(pc+imm>=p.length){trap(9);break} steps++; const next=pc+1+imm; pc=next;
    const pops=op===3||op===4||op===0x17||op===0x1b||op===0x31||op===0x32||op===0x40||op===0x50||op===0x51||op===0x53?1:[5,6,0x41].includes(op)?2:op===7?3:op>=0x10&&op<=0x16||op>=0x18&&op<=0x1e||op>=0x20&&op<=0x22?2:0;
    const pushes=op===1||op===2||op===0x52?1:op===4?2:op===6?3:op>=0x10&&op<=0x22?1:0;
    if(s<pops){trap(2);break} if(s-pops+pushes>256){trap(3);break}
    const b=d[s-1],a=d[s-2]; let r=0;
    if(op===0)break;
    if(op===1)d[s++]=(p[next-1]<<24)>>24;
    else if(op===2)d[s++]=p[next-4]|p[next-3]<<8|p[next-2]<<16|p[next-1]<<24;
    else if(op===3)s--;
    else if(op===4)d[s]=d[s-1],s++;
    else if(op===5){d[s-1]=a;d[s-2]=b}
    else if(op===6)d[s++]=d[s-2];
    else if(op===7){r=d[s-3];d[s-3]=d[s-2];d[s-2]=d[s-1];d[s-1]=r}
    else if(op===0x17)d[s-1]=-b|0; else if(op===0x1b)d[s-1]=~b;
    else if(op>=0x10&&op<=0x22){
      switch(op){case 0x10:r=a+b|0;break;case 0x11:r=a-b|0;break;case 0x12:r=Math.imul(a,b);break;case 0x13:case 0x14:case 0x15:case 0x16:if(!b){trap(4);break} r=op===0x13?(a===-2147483648&&b===-1?a:a/b|0):op===0x14?(b===-1?0:a%b|0):op===0x15?Math.floor((a>>>0)/(b>>>0))|0:(a>>>0)%(b>>>0)|0;break;case 0x18:r=a&b;break;case 0x19:r=a|b;break;case 0x1a:r=a^b;break;case 0x1c:r=a<<(b&31);break;case 0x1d:r=a>>(b&31);break;case 0x1e:r=a>>>(b&31);break;case 0x20:r=+(a===b);break;case 0x21:r=+(a<b);break;case 0x22:r=+( (a>>>0)<(b>>>0));}
      if(exit===4)break; s-=2;d[s++]=r;
    } else if(op>=0x30&&op<=0x32){const rel=(p[next-2]|p[next-1]<<8)<<16>>16; const take=op===0x30?true:op===0x31?d[--s]===0:d[--s]!==0;if(take)pc=next+rel}
    else if(op===0x33){if(cs===64){trap(7);break}c[cs++]=next;pc=p[next-2]|p[next-1]<<8}
    else if(op===0x34){if(!cs){trap(8);break}pc=c[--cs]}
    else if(op===0x40||op===0x41){const addr=op===0x40?b:b;if(addr<0||addr>255){trap(6);break}if(op===0x40)d[s-1]=m[addr];else{s-=2;m[addr]=a}}
    else if(op===0x50){const bytes=new TextEncoder().encode(String(b));if(out.length+bytes.length>65536){trap(11);break}s--;out.push(...bytes)}
    else if(op===0x51){if(out.length===65536){trap(11);break}out.push(b&255);s--}
    else if(op===0x52)d[s++]=ip<input.length?input[ip++]:-1;
    else if(op===0x53){exit=b&255;break}
  }
  const dest=join(rootOut,id); await mkdir(dest,{recursive:true}); await Promise.all([writeFile(join(dest,'stdout.bin'),Uint8Array.from(out)),writeFile(join(dest,'exit.txt'),String(exit))]);
}
}
main();
