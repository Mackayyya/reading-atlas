const seedBooks = [
  {id:1,title:'百年孤独',author:'加西亚·马尔克斯',place:'马孔多，哥伦比亚',lat:4.57,lng:-74.29,status:'已读',note:'一本书的时间，可以比一个人的一生更长。'},
  {id:2,title:'局外人',author:'阿尔贝·加缪',place:'阿尔及尔，阿尔及利亚',lat:36.75,lng:3.04,status:'已读',note:'在炽热的阳光下，重新理解沉默与自由。'},
  {id:3,title:'挪威的森林',author:'村上春树',place:'东京，日本',lat:35.68,lng:139.69,status:'在读',note:'有些地方只在记忆里存在，却依然可以抵达。'},
  {id:4,title:'月亮与六便士',author:'毛姆',place:'巴黎，法国',lat:48.86,lng:2.35,status:'已读',note:'离开熟悉的生活，去追一件无法解释的事。'}
];
const cloudConfig = window.READING_ATLAS_SUPABASE || {};
const cloud = cloudConfig.url && cloudConfig.anonKey && window.supabase
  ? window.supabase.createClient(cloudConfig.url, cloudConfig.anonKey)
  : null;
let books = JSON.parse(localStorage.getItem('reading-atlas-books') || 'null') || seedBooks;
let activeFilter = '全部'; let selectedId = books[0]?.id; let mapScale = 1;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function saveLocal(){ localStorage.setItem('reading-atlas-books', JSON.stringify(books)); }
function setSyncStatus(message, isError = false){ const status = $('#syncStatus'); status.textContent = message; status.style.color = isError ? 'var(--coral)' : ''; }
async function loadBooks(){
  if(!cloud){ setSyncStatus('本地档案模式'); return; }
  setSyncStatus('正在连接共享档案…');
  const {data, error} = await cloud.from('books').select('*').order('created_at', {ascending:false});
  if(error){ setSyncStatus('云端连接失败，已使用本地档案', true); return; }
  books = data || [];
  selectedId = books[0]?.id;
  setSyncStatus('共享档案已同步');
  render();
}
async function addBook(book){
  if(!cloud){ books=[book,...books]; saveLocal(); setSyncStatus('本地档案已保存'); return true; }
  setSyncStatus('正在保存到共享档案…');
  const {data, error} = await cloud.from('books').insert(book).select().single();
  if(error){ setSyncStatus('保存失败，请检查数据库配置', true); return false; }
  books=[data,...books]; setSyncStatus('共享档案已同步'); return true;
}
async function deleteBook(id){
  if(cloud){ setSyncStatus('正在删除记录…'); const {error}=await cloud.from('books').delete().eq('id', id); if(error){ setSyncStatus('删除失败，请稍后重试', true); return false; } }
  books=books.filter(item=>item.id!==id); saveLocal(); setSyncStatus(cloud?'共享档案已同步':'本地档案已保存'); return true;
}
function filteredBooks(){ const query=$('#searchInput').value.trim().toLowerCase(); return books.filter(book => (activeFilter==='全部'||book.status===activeFilter) && [book.title,book.author,book.place].some(item=>item.toLowerCase().includes(query))); }
function render(){
  $('#bookCount').textContent=books.length; $('#allCount').textContent=books.length; $('#readCount').textContent=books.filter(book=>book.status==='已读').length; $('#readingCount').textContent=books.filter(book=>book.status==='在读').length; $('#placeCount').textContent=new Set(books.map(book=>book.place)).size;
  $('#bookList').innerHTML=filteredBooks().map(book=>`<button class="book-item ${book.id===selectedId?'selected':''}" data-id="${book.id}"><span class="book-cover">${esc(book.title.slice(0,2))}</span><span><span class="book-title">${esc(book.title)}</span><span class="book-author">${esc(book.author)}</span></span><i class="status-dot ${book.status==='在读'?'reading':''}"></i></button>`).join('') || '<div class="empty-list">还没有匹配的书。<br>换个关键词，或者记录一本新书。</div>';
  $('#markers').innerHTML=books.map(book=>{const left=((Number(book.lng)+180)/360)*100;const top=((90-Number(book.lat))/180)*100;return `<button class="marker ${book.status==='在读'?'reading':''} ${book.id===selectedId?'active':''}" style="left:${left}%;top:${top}%" data-id="${book.id}" aria-label="${esc(book.title)}"><span class="marker-pin"></span></button>`}).join('');
  document.querySelectorAll('[data-id]').forEach(item=>item.addEventListener('click',()=>{selectedId=Number(item.dataset.id);renderDetail();render();})); renderDetail();
}
function renderDetail(){const book=books.find(item=>item.id===selectedId);if(!book){$('#detailPanel').innerHTML='<div class="detail-empty">从书架中选择一本书<br>让它在地图上展开。</div>';return}$('#detailPanel').innerHTML=`<div class="detail-head"><div><div class="detail-kicker">SELECTED BOOK · ${book.status.toUpperCase()}</div><h2 class="detail-title">${esc(book.title)}</h2><div class="detail-author">${esc(book.author)}</div></div><span class="status-dot ${book.status==='在读'?'reading':''}"></span></div><div class="detail-cover">${esc(book.title)}<br><small>${esc(book.author)}</small></div><div class="detail-meta"><div><span>阅读地点</span><strong>${esc(book.place)}</strong></div><div><span>坐标</span><strong>${Number(book.lat).toFixed(2)}° N · ${Number(book.lng).toFixed(2)}° E</strong></div></div><p class="note"><span class="quote-mark">“</span>${esc(book.note||'这本书把我带到了一个新的地方。')}</p><button class="delete-button" data-delete="${book.id}">删除这条记录 ×</button>`;document.querySelector('[data-delete]').addEventListener('click',async()=>{if(await deleteBook(book.id)){selectedId=books[0]?.id;render()}})}
function openDialog(){ $('#bookDialog').showModal(); $('#bookForm').reset(); }
document.addEventListener('DOMContentLoaded',()=>{ $('#dateLabel').textContent=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(new Date()); render(); loadBooks(); document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;document.querySelectorAll('.filter').forEach(item=>item.classList.toggle('active',item===button));render() })); $('#searchInput').addEventListener('input',render); $('#addBookTop').addEventListener('click',openDialog); $('#addBookBottom').addEventListener('click',openDialog); $('#closeDialog').addEventListener('click',()=>$('#bookDialog').close()); $('#cancelDialog').addEventListener('click',()=>$('#bookDialog').close()); $('#bookForm').addEventListener('submit',async(event)=>{event.preventDefault();const form=event.currentTarget;const submitButton=form.querySelector('.submit-button');submitButton.disabled=true;const data=new FormData(form);const book={title:data.get('title'),author:data.get('author'),place:data.get('place'),status:data.get('status'),lat:Number(data.get('lat')),lng:Number(data.get('lng')),note:data.get('note')};const saved=await addBook(book);submitButton.disabled=false;if(saved){selectedId=books[0]?.id;form.closest('dialog').close();render()}}); $('#zoomIn').addEventListener('click',()=>{mapScale=Math.min(1.5,mapScale+.1);$('#markers').style.transform=`scale(${mapScale})`});$('#zoomOut').addEventListener('click',()=>{mapScale=Math.max(.8,mapScale-.1);$('#markers').style.transform=`scale(${mapScale})`});$('#resetMap').addEventListener('click',()=>{mapScale=1;$('#markers').style.transform='scale(1)'}) });