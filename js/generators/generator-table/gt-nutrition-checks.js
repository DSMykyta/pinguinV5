// Internal composition checks. Thresholds: МОЗ №1145, annex 1; Law 2639-VIII, annexes 9–11.
import { getSugarClaimHints, servingHeading, ingredientHeading, ingredientListEligible, ADDED_SUGAR_PATTERN } from './gt-sugar-claims.js';
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const name=v=>norm(v).replace(/^(?:[-–—]\s*|(?:з них|из них|of which):?\s*)+/u,'').replace(/[,;:]\s*(?:г|g|мг|mg|мкг|mcg|ккал|kcal)$/u,'').replace(/:$/,'').trim();
function quantity(v,basis=false){
    let s=norm(v);
    if(basis)s=s.replace(/^(?:на|per)\s+/u,'').replace(/^(?:1\s+)?(?:порція|порция|порцію|порцию|serving|батончик|штука|шт\.?|bar)\s*\((.+)\)$/u,'$1');
    const m=s.match(/^(\d+(?:[.,]\d+)?)\s*(грам(?:ів|и|м(?:ов|а)?)?|гр\.?|г|g|grams?|мг|mg|міліграм(?:ів|и)?|миллиграм(?:мов|ма)?|мкг|µg|μg|mcg|ug|мл|ml|мілілітр(?:ів|и)?|миллилитр(?:ов|а)?|ккал|kcal|кдж|kj)(?:\s*(?:re|ре|α-te|ne))?$/u);
    if(!m)return null;
    const n=Number(m[1].replace(',','.')),u=m[2];
    if(!Number.isFinite(n)||(basis&&!n))return null;
    if(/^(?:мл|ml|мілілітр|миллилитр)/u.test(u))return basis?{type:'volume',n}:null;
    if(/^(?:ккал|kcal|кдж|kj)$/u.test(u))return basis?null:{type:'energy',n:/^(?:кдж|kj)$/u.test(u)?n/4.184:n};
    if(/^(?:мг|mg|міліграм|миллиграм)/u.test(u))return basis?null:{type:'mass',n:n/1000};
    if(/^(?:мкг|µg|μg|mcg|ug)$/u.test(u))return basis?null:{type:'mass',n:n/1e6};
    return {type:'mass',n};
}
const keys={
 energy:/^(?:калорії|калории|енергетична цінність|энергетическая ценность|energy|calories|калорійність|калорийность)$/,
 fat:/^(?:жири|жиры|жир|fat|total fat)$/,
 sat:/^(?:насичені(?: жири| жирні кислоти)?|насыщенные(?: жиры| жирные кислоты)?|saturated(?: fat)?)$/,
 trans:/^(?:транс[- ]?жири|транс[- ]?жиры|трансжирні кислоти|trans fat)$/,
 mono:/^(?:мононенасичені(?: жири| жирні кислоти)?|мононенасыщенные(?: жиры| жирные кислоты)?|monounsaturated(?: fat)?)$/,
 poly:/^(?:поліненасичені(?: жири| жирні кислоти)?|полиненасыщенные(?: жиры| жирные кислоты)?|polyunsaturated(?: fat)?)$/,
 carbs:/^(?:вуглеводи|углеводы|carbohydrates|carbs|total carbohydrate)$/,
 sugar:/^(?:цукор|цукри|цукрів|сахар|сахара|сахаров|sugar|sugars)$/,
 polyols:/^(?:поліоли|полиолы|polyols|sugar alcohols)$/,
 erythritol:/^(?:еритритол|еритрит|эритритол|эритрит|erythritol)$/,
 starch:/^(?:крохмаль|крахмал|starch)$/,
 fiber:/^(?:харчові волокна|пищевые волокна|клітковина|клетчатка|fiber|fibre|dietary fiber|dietary fibre)$/,
 protein:/^(?:білок|білки|белок|белки|protein|proteins)$/,
 salt:/^(?:сіль|соль|salt)$/,
 sodium:/^(?:натрій|натрий|sodium)$/,
 cholesterol:/^(?:холестерин|cholesterol)$/,
 alcohol:/^(?:алкоголь|спирт|alcohol)$/,
 acids:/^(?:органічні кислоти|органические кислоты|organic acids)$/
};
const keyOf=v=>Object.keys(keys).find(k=>keys[k].test(name(v)));
const references=[
 ['a|а',.0008],['d|д|d2|d3',.000005],['e|е',.012],['k|к|k1|k2',.000075],['c|с',.08],['b1|в1',.0011],['b2|в2',.0014],['b3|в3|pp',.016],['b6|в6',.0014],['b9|в9',.0002],['b12|в12',.0000025],['b7|в7',.00005],['b5|в5',.006]
].map(([a,n])=>[new RegExp('^(?:вітамін|витамин|vitamin) (?:'+a+')$','u'),n]);
const minerals=[
 ['тіамін|тиамин|thiamine',.0011],['рибофлавін|рибофлавин|riboflavin',.0014],['ніацин|ниацин|niacin',.016],['піридоксин|пиридоксин|pyridoxine',.0014],['фолієва кислота|фолиевая кислота|folic acid',.0002],['біотин|биотин|biotin',.00005],['пантотенова кислота|пантотеновая кислота|pantothenic acid',.006],['калій|калий|potassium',2],['хлориди|хлориды|chlorides?',.8],['кальцій|кальций|calcium',.8],['фосфор|phosphorus',.7],['магній|магний|magnesium',.375],['залізо|железо|iron',.014],['цинк|zinc',.01],['мідь|медь|copper',.001],['марганець|марганец|manganese',.002],['фториди|фториды|fluoride',.0035],['селен|selenium',.000055],['хром|chromium',.00004],['молібден|молибден|molybdenum',.00005],['йод|іод|iodine',.00015]
].map(([a,n])=>[new RegExp('^(?:'+a+')$','u'),n]);
const stop=r=>r.separator||r.header||ingredientHeading(r.left)||/^(?:застереження|попередження|предупреждение|рекомендац|умови зберігання|условия хранения|warning|storage|алергени|аллергены|склад може|состав может)/u.test(norm(r.left));
function sections(rows){
 const out=[];
 for(let i=0;i<rows.length;i++){
  const h=ingredientHeading(rows[i].left);if(!h)continue;
  const fields=[];
  if(h[1])fields.push({i,side:'left',text:rows[i].left});
  if(!rows[i].single&&norm(rows[i].right))fields.push({i,side:'right',text:rows[i].right});
  for(let j=i+1;j<rows.length;j++){const r=rows[j];if(stop(r)||servingHeading(r.left))break;if(!norm(r.left)&&!norm(r.right))continue;if(!r.single)break;if(norm(r.left))fields.push({i:j,side:'left',text:r.left});}
  out.push({i,fields,text:fields.map(f=>f.i===i&&f.side==='left'?String(f.text).split(':').slice(1).join(':'):f.text).join(' ')});
 }
 return out;
}
const patterns=[
 ['Added Sugar','red',ADDED_SUGAR_PATTERN],
 ['Aspartame','yellow',/(?<![\p{L}\p{N}])(?:аспартам\p{L}*|aspartame|[eе][ -]?951)(?![\p{L}\p{N}])/iu],
 ['Sweeteners','yellow',/(?<![\p{L}\p{N}])(?:підсолоджувач\p{L}*|подсластител\p{L}*|sweeteners?|сукралоз\p{L}*|sucralose|мальтит\p{L}*|maltitol|сорбіт\p{L}*|сорбит\p{L}*|sorbitol|еритрит\p{L}*|эритрит\p{L}*|erythritol|ксиліт\p{L}*|ксилит\p{L}*|xylitol|ізомальт(?:у|ом)?|изомальт(?:а|ом)?|isomalt|маніт\p{L}*|маннит\p{L}*|mannitol|лактит\p{L}*|lactitol|стеві\p{L}*|стеви\p{L}*|stevia|стевіол\p{L}*|steviol|ацесульфам\p{L}*|acesulfame|сахарин\p{L}*|saccharin|цикламат\p{L}*|cyclamate|[eе][ -]?(?:420|421|950|952|953|954|955|960[a-d]?|961|962|964|965|966|967|968))(?![\p{L}\p{N}])/iu],
 ['Caffeine','yellow',/(?<![\p{L}\p{N}])(?:кофеїн\p{L}*|кофеин\p{L}*|caffeine|гуаран\p{L}*|guarana)(?![\p{L}\p{N}])/iu],
 ['Allergens','yellow',/(?<![\p{L}\p{N}])(?:молок\p{L}*|молочн\p{L}*|milk|лактоз\p{L}*|lactose|казеїн\p{L}*|казеин\p{L}*|casein|сироватк\p{L}*|сыворот\p{L}*|whey|вершк\p{L}*|сливк\p{L}*|cream|пшениц\p{L}*|wheat|жито|ржан\p{L}*|rye|ячмін\p{L}*|ячмен\p{L}*|barley|овес|вівс\p{L}*|овсян\p{L}*|oats?|глютен\p{L}*|gluten|арахіс\p{L}*|арахис\p{L}*|peanuts?|соєв\p{L}*|соев\p{L}*|сої|соя|сои|soy(?:a|bean)?|яйц\p{L}*|eggs?|горіх\p{L}*|орех\p{L}*|nuts?|мигдал\p{L}*|миндал\p{L}*|almonds?|фісташ\p{L}*|фисташ\p{L}*|pistachios?|фундук\p{L}*|hazelnuts?|кеш['’]?ю|cashews?|макадамі\p{L}*|макадами\p{L}*|macadamia|кунжут\p{L}*|sesame|гірчиц\p{L}*|горчиц\p{L}*|mustard|селер\p{L}*|сельдере\p{L}*|celery|люпин\p{L}*|lupin|риб(?:а|и|у|ний|ного)|рыб\p{L}*|fish|ракоподібн\p{L}*|ракообразн\p{L}*|crustaceans?|молюск\p{L}*|моллюск\p{L}*|molluscs?|сульфіт\p{L}*|сульфит\p{L}*|sulfites?|діоксид сірки|диоксид серы|sulfur dioxide)(?![\p{L}\p{N}])/iu]
];
export function ingredientMatches(text){
 const out=[];text=String(text??'');
 for(const [label,color,rx] of patterns)for(const m of text.matchAll(new RegExp(rx.source,'giu'))){
  if(label==='Allergens'&&/^(?:молок|milk|вершк|сливк|cream)/iu.test(m[0])&&(/(?:кокосов\p{L}*|coconut)\s*$/iu.test(text.slice(Math.max(0,m.index-35),m.index))||/^\s+(?:кокосов\p{L}*|coconut)(?!\p{L})/iu.test(text.slice(m.index+m[0].length))))continue;
  out.push({start:m.index,end:m.index+m[0].length,label,color});
 }
 out.sort((a,b)=>a.start-b.start||Number(b.color==='red')-Number(a.color==='red')||b.end-a.end);
 const result=[];for(const m of out){const last=result.at(-1);if(last&&m.start<last.end){if(m.start===last.start&&m.end===last.end)last.label+=' / '+m.label;continue;}result.push({...m});}return result;
}
export function analyzeTable(rows){
 const hints=rows.map(()=>[]),highlights=rows.map(()=>({}));
 const put=(i,label,detail='',color='main')=>{if(i!==undefined&&!hints[i].some(h=>h.label===label))hints[i].push({label,detail,color});};
 const blocks=sections(rows);
 for(const b of blocks){
  if(!ingredientListEligible(b.text)&&!ingredientMatches(b.text).length)put(b.i,'Missing Ingredients','Заповніть перелік інгредієнтів.','red');
  for(const f of b.fields)highlights[f.i][f.side]=ingredientMatches(f.text);
 }
 const sugar=getSugarClaimHints(rows);
 for(let i=0;i<rows.length;i++){
  const r=rows[i],n=name(r.left);if(r.separator||r.header||r.single||ingredientHeading(r.left))continue;
  const q=quantity(r.right);
  if(/^(?:[lл][- ]?)?(?:ізолейцин|изолейцин|isoleucine|лейцин|leucine|валін|валин|valine)$/u.test(n))put(i,'BCAA','Незамінна амінокислота з розгалуженим ланцюгом.','yellow');
  else if(/^(?:[lл][- ]?)?(?:гістидин|гистидин|histidine|лізин|лизин|lysine|метіонін|метионин|methionine|фенілаланін|фенилаланин|phenylalanine|треонін|треонин|threonine|триптофан|tryptophan)$/u.test(n))put(i,'EAA','Незамінна амінокислота.','yellow');
  const ref=[...references,...minerals].find(([rx])=>rx.test(n.replace(/\s*\([^)]*\)$/u,'')));
  if(ref&&q?.type==='mass')put(i,Math.round(q.n/ref[1]*100)+'% NRV','Референсна величина для дорослих (додаток 9).');
  if(/^(?:epa|епк|ейкозапентаєнова кислота|эйкозапентаеновая кислота)(?:\s*\([^)]*\))?$/u.test(n))put(i,'EPA');
  if(/^(?:dha|дгк|докозагексаєнова кислота|докозагексаеновая кислота)(?:\s*\([^)]*\))?$/u.test(n))put(i,'DHA');
  if(/(?:елементарн\p{L}*|элементарн\p{L}*|elemental)/u.test(n)&&q?.type==='mass')put(i,'Elemental','Явно зазначена елементарна кількість.');
  if(sugar[i]?.length)put(i,sugar[i][0],sugar[i][0]==='No Added Sugar'?'Попередня перевірка тексту; підтвердьте рецептуру.':'Не більше 0,5 г цукрів на 100 г/мл.');
 }
 const starts=rows.map((r,i)=>servingHeading(r.left)?i:-1).filter(i=>i>=0);
 for(let k=0;k<starts.length;k++){
  const start=starts[k],end=starts[k+1]??rows.length,basis=quantity(rows[start].right,true),data=new Map();
  for(let i=start+1;i<end;i++){
   const r=rows[i];if(stop(r))break;if(r.single)continue;const key=keyOf(r.left);if(!key)continue;
   const q=quantity(r.right);
   if(!norm(r.right)){if(['energy','fat','sat','carbs','sugar','protein','salt'].includes(key))put(i,'Missing Value','Заповніть значення.','red');continue;}
   if(!q||q.type!==(key==='energy'?'energy':'mass')){put(i,'Unit Check','Перевірте число та одиницю.','yellow');continue;}
   if(data.has(key)){const prev=data.get(key);prev.duplicate=true;put(prev.i,'Duplicate','Повторний показник.','red');put(i,'Duplicate','Повторний показник.','red');continue;}
   data.set(key,{i,v:q.n});
  }
  const get=key=>{const x=data.get(key);return x&&!x.duplicate?x.v:null;};
  const idx=key=>data.get(key)?.i, valid=key=>get(key)!==null, mass=basis?.type==='mass', liquid=basis?.type==='volume';
  const per=key=>basis&&valid(key)?get(key)*100/basis.n:null;
  const le=(a,b)=>a!==null&&a<=b+1e-9,ge=(a,b)=>a!==null&&a+1e-9>=b;
  const fmt=v=>Number(v.toFixed(4)).toLocaleString('uk-UA');
  const basisLabel=liquid?'100 мл':'100 г';
  const threshold=(key,limit,unit='г')=>'Фактично: '+fmt(per(key))+' '+unit+'/'+basisLabel+'. Допустимо: ≤ '+fmt(limit)+' '+unit+'/'+basisLabel+'.';
  const claim=(key,label,detail='')=>put(idx(key),label,detail);
  const e=get('energy');
  if(mass)for(const key of ['fat','carbs','protein'])if(valid(key)&&get(key)>0)claim(key,Math.round(per(key))+'%','Масова частка порції.');
  if(basis){
   if(valid('sugar')){
    const i=idx('sugar'),old=hints[i].some(h=>h.label==='Sugar Free'||h.label==='No Added Sugar');
    if(le(per('sugar'),.5)){hints[i]=hints[i].filter(h=>h.label!=='No Added Sugar');claim('sugar','Sugar Free',threshold('sugar',.5));}
    else if(!old&&le(per('sugar'),liquid?2.5:5))claim('sugar','Low Sugar',threshold('sugar',liquid?2.5:5));
   }
   if(le(per('fat'),.5))claim('fat','Fat Free',threshold('fat',.5));
   else if(le(per('fat'),liquid?1.5:3))claim('fat','Low Fat',threshold('fat',liquid?1.5:3)+' Для молока діють окремі правила.');
   const saltKey=valid('salt')?'salt':'sodium',s=per(saltKey),salt=s===null?null:s*(saltKey==='sodium'?2.5:1);
   const saltDetail=limit=>'Еквівалент солі: '+fmt(salt)+' г/'+basisLabel+'. Допустимо: ≤ '+fmt(limit)+' г/'+basisLabel+'. Для води діють окремі правила.';
   if(le(salt,.0125))claim(saltKey,'Salt Free',saltDetail(.0125));
   else if(le(salt,.1))claim(saltKey,'Very Low Salt',saltDetail(.1));
   else if(le(salt,.3))claim(saltKey,'Low Salt',saltDetail(.3));
   if(liquid&&le(per('energy'),4))claim('energy','Calorie Free',threshold('energy',4,'ккал'));
   else if(le(per('energy'),liquid?20:40))claim('energy','Low Calorie',threshold('energy',liquid?20:40,'ккал'));
   if(mass&&per('polyols')!==null&&per('polyols')>10)put(idx('polyols'),'Polyol Warning','Перевірте, чи понад 10% саме доданих поліолів, і наявність попередження.','yellow');
  }
  const fiberEnergy=e>0&&valid('fiber')?get('fiber')*100/e:null;
  const fiberDetail=(g,kcal)=>[mass&&valid('fiber')?'Фактично: '+fmt(per('fiber'))+' г/100 г.':'',fiberEnergy!==null?'Фактично: '+fmt(fiberEnergy)+' г/100 ккал.':'','Поріг: ≥ '+fmt(g)+' г/100 г або ≥ '+fmt(kcal)+' г/100 ккал.'].filter(Boolean).join(' ');
  if((mass&&ge(per('fiber'),6))||ge(fiberEnergy,3))claim('fiber','High Fiber',fiberDetail(6,3));
  else if((mass&&ge(per('fiber'),3))||ge(fiberEnergy,1.5))claim('fiber','Source of Fiber',fiberDetail(3,1.5));
  if(e>0&&valid('protein')){const share=get('protein')*400/e;if(ge(share,20))claim('protein','High Protein','Фактично: '+fmt(share)+'% енергії з білка. Поріг: ≥ 20%.');else if(ge(share,12))claim('protein','Source of Protein','Фактично: '+fmt(share)+'% енергії з білка. Поріг: ≥ 12%.');}
  const excess=(parent,children,label)=>{if(valid(parent)){const sum=children.reduce((s,k)=>s+(get(k)??0),0);if(sum>get(parent)+.1)put(idx(parent),label,'Сума підвидів '+Number(sum.toFixed(4))+' г > '+get(parent)+' г.','red');}};
  if(valid('sugar')&&valid('carbs')&&get('sugar')>get('carbs')+.1)put(idx('sugar'),'Sugar Error','Цукри перевищують вуглеводи.','red');
  excess('carbs',['sugar','polyols','starch'],'Carb Error');excess('fat',['sat','trans','mono','poly'],'Fat Error');
  if(mass){const sum=['fat','carbs','protein','fiber','salt','alcohol','acids'].reduce((s,k)=>s+(get(k)??0),0);if(sum>basis.n+Math.max(.2,basis.n*.01))put(start,'Mass Error','Сума '+Number(sum.toFixed(3))+' г > маса порції '+basis.n+' г.','red');}
  if(e!==null&&['fat','carbs','protein'].every(valid)){
   const p=get('polyols')??0,er=get('erythritol')??0,c=get('carbs');
   const text=blocks.filter(b=>b.i>start&&b.i<end).map(b=>b.text).join(' ');
   const uncertain=/(?:мальтит|maltitol|сорбіт|сорбит|sorbitol|ксиліт|ксилит|xylitol|еритрит|эритрит|erythritol|ізомальт(?!о)|изомальт(?!о)|поліол|полиол|polyols)/iu.test(text)&&!valid('polyols');
   if(p<=c+.1&&er<=p+.1&&!uncertain){
    const high=get('fat')*9+(c-p)*4+(p-er)*2.4+get('protein')*4+(get('fiber')??0)*2+(get('alcohol')??0)*7+(get('acids')??0)*3;
    const low=valid('erythritol')?high:high-p*2.4;
    if(Math.max(0,low-e,e-high)>Math.max(10,e*.1))put(idx('energy'),'Calorie Check','Орієнтовно '+Math.round(low)+(high-low>.1?'–'+Math.round(high):'')+' ккал; перевірте округлення та інші джерела енергії.','yellow');
   }
  }
 }
 return {hints,highlights};
}
