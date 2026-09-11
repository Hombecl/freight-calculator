import data from '../data/receiverProfiles.json';
import type { Check } from './packChecks';

const assumptions: Record<string, string> = {
 ALL_CARGO_PLACED: '只計整櫃實際擺位；散貨係容積／成本估算，未驗證裝載。',
 PO_TOGETHER: '同一 PO 分到多個櫃或餘貨即屬拆單；盡量整單裝載，唔保證做到。',
 WINDOW_RESPECTED: '備妥日期包括時間窗首尾；欠日期會排除，優先次序唔會改變資格。',
 RATES_PROVIDED: '所有用到嘅櫃同散貨餘貨都要提供同一貨幣報價；未計起點／目的地費用同截關。',
 PLACEMENT_COMPLETE: '啟發式擺位，至少六成底面承托、冇重疊；未放入嘅箱喺所填限制下放唔落，唔代表已證明最少空間。',
 DOOR_APERTURE: '只比較紙箱截面同櫃門尺寸；未計叉車升降、傾斜同卡板通行空間。',
 PAYLOAD: '已放紙箱重量總和對照所填載重上限；欠重量或上限就無法評估。',
 STACK_LIMITS_PROVIDED: '按每箱頂部承重同上方重量傳遞檢查；欠頂部承重視作無限，唔係紙板強度認證。',
 HEAVY_OVER_LIGHT: '同直接承托佢嘅最輕紙箱比較；零重量視為未知。',
 COG_HEIGHT: '按貨重計重心高度比例；高過約 55% 可能頭重腳輕，未計車輛重量。',
 LOAD_VOIDS: '只量沿櫃長方向嘅空隙，未量橫向同垂直空位；超過 15 cm 要填隙或加固。',
 AXLE_LOADS: '只按貨物同兩支點槓桿計算；需要軸位、軸載上限同貨重，未計車身同燃油，唔係法定軸重判定。',
 VGM: 'VGM 必須包括卡板、填充同固定物料，並用認可方法量度；呢個數字唔係申報。',
 ZONE_SEGREGATION: '溫度／危險品分區需要區域幾何同每件貨嘅分區要求；呢個端點未評估。',
 ALL_ORDERS_FIT: '目錄以外紙箱嘅訂單比例；只係搜尋上限內搵到嘅覆蓋率，後備費用係估算，唔計入節省。',
 DIVISOR_STATED: '使用你提供嘅材積除數同單位，未計承運商進位規則。',
 RATE_PROVIDED: '成本需要每 kg／lb 報價；所有金額必須同一貨幣。',
 CATALOG_SIZE_RESPECTED: '目錄箱型數係上限；候選箱較少，結果亦會較少。',
};
const exact: Record<string,string> = {
 'Required profile value or source input is missing.':'欠缺必要設定值或原始輸入。',
 'crew confirms on the build sheet':'由倉務員喺砌板單確認。',
 'No placed pallets to evaluate.':'冇已放好嘅卡板可供評估。',
 'Tare missing; gross weight cannot be confirmed.':'欠空板重，無法確認毛重。',
 'Footprint dimensions only; pallet construction and four-way access require crew confirmation.':'只檢查板面尺寸；板身結構同四向入叉要由倉務員確認。',
 'Per-carton maxStack enforced by the packing engine; not a board-strength certification.':'裝箱引擎有執行每箱頂部承重限制，唔係紙板強度認證。',
 'Supply maxStack for every carton to evaluate stacking.':'請提供每箱頂部承重先可評估堆疊。',
 'Original carton dimensions missing; crew must confirm orientation.':'欠原始紙箱尺寸，擺放方向要由倉務員確認。',
 'Placed vertical dimension compared with original carton height; printed arrow direction requires crew confirmation.':'比較已放紙箱垂直尺寸同原始高度；印刷箭嘴方向要由倉務員確認。',
 'No shipment window supplied.':'未提供出貨時間窗。',
};
export function checkAssumption(c: Check, lang: string): string {
 if(lang !== 'zh') return c.assumption;
 if(exact[c.assumption]) return exact[c.assumption];
 if(c.assumption.startsWith('Screening predicted ')) return '以 cm／kg 對照設定作預測篩查；高度同毛重包括包裝。';
 return assumptions[c.code] ?? '呢項檢查只作篩查，請按所填限制核對；未評估唔代表通過。';
}
export const checkName = (code:string, lang:string) => lang === 'zh' ? ({ALL_CARGO_PLACED:'貨物擺位',PO_TOGETHER:'整單裝載',WINDOW_RESPECTED:'備妥時間窗',RATES_PROVIDED:'報價資料',PLACEMENT_COMPLETE:'幾何擺位',DOOR_APERTURE:'櫃門通行',PAYLOAD:'載重',STACK_LIMITS_PROVIDED:'堆疊承重',HEAVY_OVER_LIGHT:'重箱壓輕箱',COG_HEIGHT:'重心高度',LOAD_VOIDS:'空隙',AXLE_LOADS:'軸重',VGM:'核實總重',ZONE_SEGREGATION:'分區',ALL_ORDERS_FIT:'訂單適配',DIVISOR_STATED:'材積除數',RATE_PROVIDED:'報價',CATALOG_SIZE_RESPECTED:'目錄箱型上限'} as Record<string,string>)[code] ?? code : code;
export function ruleText(rule:{text:string;textZh?:unknown},lang:string) { return lang==='zh' && typeof rule.textZh==='string' ? rule.textZh : rule.text; }
export function profileText(profile:{id:string;name:string;verificationNote?:string},field:'name'|'verificationNote',lang:string) {
 const original=data.profiles.find(p=>p.id===profile.id);
 return lang==='zh' && original && profile[field]===original[field] ? original[field==='name'?'nameZh':'verificationNoteZh'] : profile[field];
}
export const screeningSemanticsZh = '檢查只按提供嘅資料作篩查，唔係安全、法規或收貨認證；未評估唔代表通過。';
export const unverifiedText = (fields:string[],lang:string) => lang==='zh' ? fields.map(f=>({'pallet.l':'板長','pallet.w':'板闊','pallet.baseHeight':'板底高','limits.maxLoadedHeight':'連板高度上限','limits.maxGrossWeight':'毛重上限','limits.overhangCm':'超出板邊限額','limits.clampable':'夾抱要求','rules.NO_OVERHANG':'禁止超出板邊','rules.GMA_PALLET':'GMA 卡板','rules.MAX_HEIGHT_72IN':'高度要求','rules.MAX_WEIGHT_1500LB':'重量要求','rules.LABELS_4_SIDES':'四面標籤'} as Record<string,string>)[f]??f).join('、') : fields.join(', ');
