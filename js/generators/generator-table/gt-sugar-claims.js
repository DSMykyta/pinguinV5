// Pure, conservative nutrition-claim hints. Internal guidance, not legal certification.
// МОЗ №1145: <= 0.5 g sugars / 100 g or 100 ml; no added sugars or sweetening foods.

export const ADDED_SUGAR_PATTERN = /(?<![\p{L}\p{N}])(?:цукор|цукр(?:у|ом|и|ів|ами|ова|овий|ове|ові)|сахар(?:а|у|ом|ы|ов|ами|ный|ная|ное|ные)?|sugars?|декстроз\p{L}*|dextrose|глюкоз\p{L}*|glucose|фруктоз\p{L}*|fructose|сахароз\p{L}*|сукроз\p{L}*|sucrose|мальтоз\p{L}*|maltose|лактоз\p{L}*|lactose|галактоз\p{L}*|galactose|трегалоз\p{L}*|trehalose|рибоз\p{L}*|ribose|сироп\p{L}*|syrups?|паток\p{L}*|molasses|мелас\p{L}*|мед|мёд|меда|меду|honey|нектар\p{L}*|nectar|джем\p{L}*|jam|повидл\p{L}*|фініков\p{L}*|фиников\p{L}*|date paste|концентрат\p{L}*\s+(?:\p{L}+\s+){0,2}(?:соку|сока|соків|соков)|(?:fruit|juice|apple|grape)\s+(?:juice\s+)?concentrate)(?![\p{L}\p{N}])/u;

function normalize(value) {return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();}

function parseQuantity(value, serving=false) {
    const input=normalize(value).replace(/,/g,'.');
    const units=serving?'грам(?:ів|и|м(?:ов|а)?)?|гр\\.?|г|g|grams?|мілілітр(?:ів|и)?|миллилитр(?:ов|а)?|мл|ml':'міліграм(?:ів|и)?|миллиграм(?:мов|ма)?|мг|mg|грам(?:ів|и|м(?:ов|а)?)?|гр\\.?|г|g|grams?';
    const quantity=`(\\d+(?:\\.\\d+)?)\\s*(${units})`;
    const plain=input.match(new RegExp(`^${quantity}$`,'u'));
    const portion=serving && input.match(new RegExp(`^(?:1\\s+(?:порція|порция|порцію|порцию|serving|батончик|штука|шт\\.?|bar))\\s*\\(${quantity}\\)$`,'u'));
    const match=plain||portion;
    if(!match) return null;
    const number=Number(match[1]);
    if(!Number.isFinite(number)||number<0||(serving&&number===0)) return null;
    return /^(?:мг|mg|міліграм|миллиграм)/u.test(match[2])?number/1000:number;
}

function isSugarRow(label) {
    return /^(?:(?:[-–—]\s*)|(?:(?:з них|из них|of which|в т\.?\s*ч\.?)\s*:?\s*))*?(?:цукор|цукри|цукрів|сахар|сахара|сахаров|sugar|sugars)(?:\s*[,:(]?\s*(?:г|g|мг|mg)\)?)?\s*:?$/u.test(normalize(label));
}

function ingredientHeading(value) {
    return normalize(value).match(/^(?:інгредієнти|ингредиенты|ingredients)\s*(?::\s*(.*))?$/u);
}

function servingHeading(value) {
    return /^(?:харчова цінність|поживна цінність|пищевая ценность|питательная ценность|nutrition facts|nutritional value)\s*:?$/u.test(normalize(value));
}

function ingredientListEligible(value) {
    const input=normalize(value);
    if(!/\p{L}{2}/u.test(input)||/^(?:[-–—\s.]*|(?:не вказано|не указано|не зазначено|відсутні дані|нет данных|немає даних|n\/a|unknown|введіть значення|введите значение|інгредієнти|ингредиенты|ingredients)[.!]?)$/u.test(input)) return false;
    // Conservative lexical screen: added mono/disaccharides and common sweetening foods.
    // Polyols and permitted sweetener additives (e.g. maltitol, sucralose) are not sugars.
    const blocked=ADDED_SUGAR_PATTERN;
    return !blocked.test(input);
}

function getSugarClaimHints(rows) {
    const result=rows.map(()=>[]);
    const starts=rows.map((row,i)=>servingHeading(row.left)?i:-1).filter(i=>i>=0);
    for(let s=0;s<starts.length;s++){
        const start=starts[s], end=starts[s+1]??rows.length;
        const serving=parseQuantity(rows[start].right,true);
        const ingredientBlocks=[];
        let firstIngredients=end;
        for(let i=start+1;i<end;i++){
            const heading=ingredientHeading(rows[i].left);
            if(!heading) continue;
            firstIngredients=Math.min(firstIngredients,i);
            const parts=[heading[1]??'',rows[i].single?'':(rows[i].right??'')];
            for(let j=i+1;j<end;j++){
                const row=rows[j];
                if(row.separator||row.header||ingredientHeading(row.left)||/^(?:застереження|попередження|предупреждение|рекомендац|умови зберігання|условия хранения|warning|storage|алергени|аллергены|склад може|состав может)/u.test(normalize(row.left))) break;
                if(normalize(row.left)||normalize(row.right)){
                    // Ingredient text is stored in one-column rows by the generator.
                    if(!row.single) break;
                    parts.push(row.left??'');
                }
            }
            ingredientBlocks.push(parts.join(' ').trim());
        }
        const noAdded=ingredientBlocks.length>0&&ingredientBlocks.every(ingredientListEligible);
        for(let i=start+1;i<firstIngredients;i++){
            const row=rows[i];
            if(row.separator||row.header) break;
            if(!isSugarRow(row.left)||row.single) continue;
            const sugar=parseQuantity(row.right);
            if(serving!==null&&sugar!==null&&sugar*200<=serving+1e-10) result[i].push('Sugar Free');
            else if(noAdded) result[i].push('No Added Sugar');
        }
    }
    return result;
}

export { getSugarClaimHints, ingredientHeading, servingHeading, ingredientListEligible };
