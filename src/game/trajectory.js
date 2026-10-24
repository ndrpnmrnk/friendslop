// Равномерный пунктир по длине дуги, независимо от скорости в вершине броска.
const lengths=[];
export function placeArcDots(from,points,count,out,limit=out.length){if(!count)return 0;let total=0,previous=from;for(let i=0;i<count;i++){total+=previous.distanceTo(points[i]);lengths[i]=total;previous=points[i];}const spacing=Math.max(.75,total/(Math.min(limit,11)+1)),visible=Math.min(limit,11,Math.max(0,Math.floor((total-.08)/spacing)));let index=0;
 for(let i=0;i<visible;i++){const distance=(i+1)*spacing;while(index<count-1&&lengths[index]<distance)index++;const a=index?points[index-1]:from,lo=index?lengths[index-1]:0,hi=lengths[index];out[i].position.lerpVectors(a,points[index],(distance-lo)/Math.max(.001,hi-lo));}return visible;}
