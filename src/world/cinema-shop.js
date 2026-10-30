// Бесплатная выкладка: каждый стакан и банка - настоящий предмет общего мира.
// Фиксированный запас на раунд, без скрытых копий, покупки и растущего спавна.
export function cinemaSnacks(b,x,z,type){
 const shelf=b.surface(x,z,1.2,3.2,1.08,0,'cinema-snacks');
 const stock=[];
 for(const u of[-.22,.22])for(const v of[-1.05,-.35,.35,1.05])stock.push(shelf.put(type,u,v));
 return {stock,shelf};
}
