import {plannerAlternatives} from '../lib/plannerAlternatives';
self.onmessage=({data})=>{
 try{self.postMessage({type:'result',alternatives:plannerAlternatives(data.container,data.specs,data.recommended)});}
 catch{self.postMessage({type:'error'});}
};
