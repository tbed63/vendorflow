import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCjAnrOfpmDMGB3O5x9i0yDZ-JR8NZMa0o",authDomain:"vendorflow-68828.firebaseapp.com",projectId:"vendorflow-68828",storageBucket:"vendorflow-68828.firebasestorage.app",messagingSenderId:"803061946107",appId:"1:803061946107:web:fe9622dd2d0c1c5c13c25e"};



const VENDORFLOW_API =
  "https://vendorflow-api.tbed63.workers.dev";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],show=e=>e.classList.remove("hidden"),hide=e=>e.classList.add("hidden"),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
let user=null,profile={},classes=[],roster=[],students=[],services=[],payments=[],certs=[],compliance=[],reviews=[],history=[],authMode="login",step=0,answers={},preview=[],map={},headers=[];
let selectedPaymentStudentId=null;
let pendingCertificatePdf=null;
let editingRosterStudentId=null;
const questions=[['businessName','What is the name of your business?','This will appear on invoices.'],['ownerName','What name should VendorFlow use for you?','Your name as vendor or owner.'],['address','What is your business mailing address?','Street address.'],['cityStateZip','What city, state, and ZIP go with that address?','Example: Encinitas, CA 92024'],['phone','What business phone number should VendorFlow use?','You can change this later.'],['locations','Where do you teach or conduct business?','Learning centers, campuses, tutoring locations, etc.'],['schools','Which charter schools or organizations do you work with?','List as many as you know now.']];
const aliases={registrationId:['id','registration id'],status:['status','registration status'],classTitle:['title','class title','class'],studentFirst:['registrant first name','student first name','child first name'],studentLast:['registrant last name','student last name','child last name'],parentFirst:['primary first name','parent first name','guardian first name'],parentLast:['primary last name','parent last name','guardian last name'],parentEmail:['email address','parent email','guardian email'],parentPhone:['phone','parent phone','guardian phone'],grade:['grade level','grade']};
const vendorDoc=()=>doc(db,'vendors',user.uid),sub=n=>collection(db,'vendors',user.uid,n),toast=m=>{let t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)};


function installVendorFlowBranding(){

  // Browser icon
  let favicon=document.querySelector('link[rel="icon"]');
  if(!favicon){
    favicon=document.createElement('link');
    favicon.rel='icon';
    document.head.appendChild(favicon);
  }
  favicon.type='image/png';
  favicon.href='vendorflow-logo.png';

  // Loading screen
  const loading=$('#loading');
  if(loading){
    loading.innerHTML=`
      <div class="vf-loading-brand">
        <img src="vendorflow-logo-dark.png" alt="VendorFlow">
        <span>Opening VendorFlow…</span>
      </div>
    `;
  }

  // Login / create account
  const authCard=document.querySelector('.auth-card');
  if(authCard && !authCard.querySelector('.vf-auth-logo')){
    const brand=document.createElement('div');
    brand.className='vf-auth-brand';
    brand.innerHTML=`
      <img class="vf-auth-logo"
           src="vendorflow-logo.png"
           alt="VendorFlow">
      <div class="vf-auth-subtitle">AI Vendor Assistant</div>
    `;

    const oldHeading=[...authCard.children].find(
      el => el.textContent && el.textContent.trim()==='VendorFlow'
    );
    if(oldHeading) oldHeading.style.display='none';

    authCard.insertBefore(brand,authCard.firstChild);
  }

  
  // Remove duplicate legacy AI Vendor Assistant copy
  if(authCard){
    [...authCard.children].forEach(el=>{
      if(
        el.classList &&
        !el.classList.contains('vf-auth-brand') &&
        el.textContent &&
        el.textContent.trim()==='AI Vendor Assistant'
      ){
        el.classList.add('vf-hide-old-auth-copy');
      }
    });
  }

// Onboarding
  const onboardingCard=document.querySelector('.onboarding-card');
  if(onboardingCard && !onboardingCard.querySelector('.vf-onboarding-logo')){
    const brand=document.createElement('div');
    brand.className='vf-onboarding-brand';
    brand.innerHTML=`
      <img class="vf-onboarding-logo"
           src="vendorflow-logo.png"
           alt="VendorFlow">
    `;
    onboardingCard.insertBefore(brand,onboardingCard.firstChild);
  }

  // Sidebar
  const side=document.querySelector('aside');
  if(side && !side.querySelector('.vf-sidebar-logo')){
    const brand=document.createElement('div');
    brand.className='vf-sidebar-brand';
    brand.innerHTML=`
      <img class="vf-sidebar-logo"
           src="vendorflow-logo-dark.png"
           alt="VendorFlow">
      <div class="vf-sidebar-subtitle">AI VENDOR ASSISTANT</div>
    `;

    const oldLogo=side.querySelector('.logo');
    if(oldLogo){
      oldLogo.replaceWith(brand);
    } else {
      side.insertBefore(brand,side.firstChild);
    }

    [...side.children].forEach(el=>{
      if(el.tagName==='H2' && el.textContent.trim()==='VendorFlow'){
        el.style.display='none';
      }
      if(el.tagName==='SMALL' && el.textContent.includes('AI VENDOR')){
        el.style.display='none';
      }
    });
  }

  
  // Navigation icons
  const vfNavIconMap={
    dashboard:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5"/>
      <path d="M5.5 10v10h5v-6h3v6h5V10"/>
    </svg>`,

    classes:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M2.5 20c.5-4 2.6-6 5.5-6s5 2 5.5 6"/>
      <path d="M14 15c3.5-.5 6 1.1 6.8 5"/>
    </svg>`,

    students:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="7.5" r="3"/>
      <path d="M3.5 19c.5-4 2.6-6 5.5-6s5 2 5.5 6"/>
      <path d="M17 5v8"/>
      <path d="M13 9h8"/>
    </svg>`,

    payments:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M7 15h4"/>
    </svg>`,

    certificates:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z"/>
      <path d="M15 3v5h5"/>
      <circle cx="11" cy="14" r="2.5"/>
      <path d="m9.5 16 1.5 3 1.5-3"/>
    </svg>`,

    compliance:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/>
      <path d="m8.5 12 2.2 2.2 4.8-5"/>
    </svg>`,

    review:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v6"/>
      <path d="M12 17h.01"/>
    </svg>`,

    history:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>`,

    profile:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4h10v17"/>
      <path d="M15 9h4v12"/>
      <path d="M8 8h2M8 12h2M8 16h2"/>
      <path d="M3 21h18"/>
    </svg>`
  };

  document.querySelectorAll('nav button[data-view]').forEach(btn=>{
    if(btn.querySelector('.vf-nav-icon')) return;

    const icon=document.createElement('span');
    icon.className='vf-nav-icon';
    icon.innerHTML=vfNavIconMap[btn.dataset.view]||'';

    btn.insertBefore(icon,btn.firstChild);
  });

// Main app header
  const header=document.querySelector('main header');
  if(header && !header.querySelector('.vf-header-logo')){
    header.classList.add('vf-app-header');

    const img=document.createElement('img');
    img.src='vendorflow-logo.png';
    img.alt='VendorFlow';
    img.className='vf-header-logo';

    header.appendChild(img);
  }

  // Password visibility eye
  const password=$('#password');

  if(password && !password.parentElement.classList.contains('vf-password-wrap')){
    const wrapper=document.createElement('div');
    wrapper.className='vf-password-wrap';

    password.parentNode.insertBefore(wrapper,password);
    wrapper.appendChild(password);

    const eye=document.createElement('button');
    eye.type='button';
    eye.className='vf-password-eye';
    eye.setAttribute('aria-label','Show password');
    eye.title='Show password';
    eye.innerHTML='👁';

    wrapper.appendChild(eye);

    eye.addEventListener('click',()=>{
      const showing=password.type==='text';
      password.type=showing?'password':'text';
      eye.setAttribute(
        'aria-label',
        showing?'Show password':'Hide password'
      );
      eye.title=showing?'Show password':'Hide password';
    });
  }

  // Recovery links
  const authToggle=$('#authToggle');

  if(authToggle && !document.querySelector('.vf-auth-help')){
    const help=document.createElement('div');
    help.className='vf-auth-help';

    const forgotPassword=document.createElement('button');
    forgotPassword.type='button';
    forgotPassword.className='vf-help-link';
    forgotPassword.textContent='Forgot password?';

    const forgotEmail=document.createElement('button');
    forgotEmail.type='button';
    forgotEmail.className='vf-help-link';
    forgotEmail.textContent='Forgot which email you used?';

    help.appendChild(forgotPassword);
    help.appendChild(document.createTextNode(' · '));
    help.appendChild(forgotEmail);

    authToggle.parentNode.insertBefore(help,authToggle);

    forgotPassword.addEventListener('click',async()=>{
      let email=$('#email')?.value.trim()||'';

      if(!email){
        email=prompt(
          'Enter the email address you use for VendorFlow:'
        )?.trim()||'';
      }

      if(!email) return;

      try{
        await sendPasswordResetEmail(auth,email);

        alert(
          'VendorFlow sent a password-reset email to ' +
          email +
          '. Check your inbox and spam folder.'
        );
      }catch(e){
        alert(
          'VendorFlow could not send the reset email. ' +
          (e?.message||'Please check the email address and try again.')
        );
      }
    });

    forgotEmail.addEventListener('click',()=>{
      alert(
        'VendorFlow does not use a separate username. ' +
        'Your login is your email address. Try the email addresses ' +
        'you normally use for your education or business work.'
      );
    });
  }
}

function setAuthMode(m){
  authMode=m;
  $('#authTitle').textContent=m==='login'?'Log in':'Create account';
  $('#authSubmit').textContent=m==='login'?'Log in':'Create account';
  $('#authToggle').textContent=m==='login'?'New to VendorFlow? Create an account':'Already have an account? Log in';
  m==='signup'?show($('#name')):hide($('#name'));
  hide($('#authError'));
}

$('#authToggle').onclick=()=>setAuthMode(authMode==='login'?'signup':'login');

$('#authSubmit').onclick=async()=>{
  try{
    hide($('#authError'));
    if(authMode==='signup'){
      let n=$('#name').value.trim();
      if(!n)throw Error('Enter your name.');
      let r=await createUserWithEmailAndPassword(auth,$('#email').value.trim(),$('#password').value);
      await updateProfile(r.user,{displayName:n});
    }else{
      await signInWithEmailAndPassword(auth,$('#email').value.trim(),$('#password').value);
    }
  }catch(e){
    $('#authError').textContent=e.message;
    show($('#authError'));
  }
};

$('#logout').onclick=$('#onboardLogout').onclick=()=>signOut(auth);

onAuthStateChanged(auth,async u=>{
  hide($('#loading'));
  hide($('#auth'));
  hide($('#onboarding'));
  hide($('#app'));

  if(!u){
    user=null;
    show($('#auth'));
    return;
  }

  user=u;
  let s=await getDoc(vendorDoc());

  if(!s.exists()||!s.data().onboardingComplete){
    profile=s.exists()?s.data():{};
    answers={...profile,ownerName:profile.ownerName||u.displayName||''};
    step=0;
    renderQuestion();
    show($('#onboarding'));
  }else{
    profile=s.data();
    await enterApp();
  }
});

function renderQuestion(){
  let[k,q,h]=questions[step];

  $('#progressBar').style.width=`${(step+1)/questions.length*100}%`;
  $('#backBtn').disabled=step===0;
  $('#nextBtn').textContent=step===questions.length-1?'Finish setup':'Next';

  $('#questionBox').innerHTML=
    `<div class="eyebrow">Question ${step+1} of ${questions.length}</div>
     <h2>${q}</h2>
     <p>${h}</p>
     ${
       ['locations','schools'].includes(k)
       ? `<textarea id="answer" class="input" rows="5">${esc(answers[k]||'')}</textarea>`
       : `<input id="answer" class="input" value="${esc(answers[k]||'')}">`
     }`;
}

$('#backBtn').onclick=()=>{
  if(step){
    answers[questions[step][0]]=$('#answer').value.trim();
    step--;
    renderQuestion();
  }
};

$('#nextBtn').onclick=async()=>{
  let k=questions[step][0];
  answers[k]=$('#answer').value.trim();

  if(['businessName','ownerName'].includes(k)&&!answers[k]){
    toast('Please answer this one first.');
    return;
  }

  if(step<questions.length-1){
    step++;
    renderQuestion();
    return;
  }

  profile={
    ...answers,
    email:user.email,
    onboardingComplete:true,
    updatedAt:serverTimestamp()
  };

  await setDoc(vendorDoc(),profile,{merge:true});
  await log('Business setup completed',`${profile.businessName} workspace created.`,'Onboarding');

  hide($('#onboarding'));
  await enterApp();
};

async function enterApp(){
  show($('#app'));
  $('#bizNameSide').textContent=profile.businessName||'VendorFlow';
  $('#userEmail').textContent=user.email||'';
  fillProfile();
  await refreshAll();
}

async function log(action,detail,source='Manual'){
  await addDoc(sub('history'),{
    action,
    detail,
    source,
    createdAt:serverTimestamp()
  });
}

async function getList(name,ordered=true){
  let c=sub(name);
  let q=ordered?query(c,orderBy('createdAt','desc')):c;
  let s=await getDocs(q);
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

async function refreshAll(){
  classes=await getList('classes',false);

  await repairRosterCoreLinksOnce();

  students=await getList('students',false);
  services=await getList('services',false);
  payments=await getList('payments');
  certs=await getList('certificates');
  compliance=await getList('compliance');
  reviews=await getList('review');
  history=await getList('history');

  const repaired=
    await repairUnmatchedPayments();

  if(repaired>0){
    payments=await getList('payments');
    history=await getList('history');
  }

  renderAll();
}


async function repairRosterCoreLinksOnce(){

  const vendorSnap=
    await getDoc(
      vendorDoc()
    );

  const vendorData=
    vendorSnap.exists()
      ? vendorSnap.data()
      : {};

  if(
    vendorData.rosterCoreBackfillV1
  ){
    return false;
  }


  for(const c of classes){

    const snap=
      await getDocs(
        collection(
          db,
          'vendors',
          user.uid,
          'classes',
          c.id,
          'students'
        )
      );

    const rows=
      snap.docs.map(
        d=>({
          id:d.id,
          ...d.data()
        })
      );

    if(rows.length){

      await syncRosterToCoreRecords(
        c,
        rows
      );
    }
  }


  await setDoc(
    vendorDoc(),
    {
      rosterCoreBackfillV1:true,
      rosterCoreBackfillAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  await log(
    'Roster accounts synchronized',
    'Existing class roster students were linked to Students & Services.',
    'VendorFlow'
  );


  return true;
}


function renderAll(){
  renderClassSelect();
  renderDashboard();
  renderRoster();
  renderArchivedClasses();
  renderStudentsServices();
  renderRefundStudentSelect();
  renderRecords();
  renderReviews();
  renderHistory();
}

function renderDashboard(){
  $('#statClasses').textContent=classes.filter(c=>!c.archived).length;
  $('#statStudents').textContent=classes.filter(c=>!c.archived).reduce((a,c)=>a+(c.activeStudentCount||0),0);
  $('#statReview').textContent=reviews.length;
  $('#statHistory').textContent=history.length;
  $('#reviewBadge').textContent=reviews.length;
  renderHistoryInto($('#recentHistory'),history.slice(0,6));
}

function renderClassSelect(){
  let sel=$('#classSelect'),v=sel.value;

  sel.innerHTML='<option value="">Choose a class</option>'+
    classes
      .filter(c=>!c.archived)
      .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
      .map(c=>`<option value="${c.id}">${esc(c.name)}${c.term?' — '+esc(c.term):''}</option>`)
      .join('');

  if(classes.some(c=>c.id===v&&!c.archived))sel.value=v;
  updateRosterUploadTarget();
}


function classIsArchived(classId){

  if(!classId){
    return false;
  }

  const c=
    classes.find(
      item=>item.id===classId
    );

  return Boolean(
    c?.archived
  );
}


function serviceCountsAsActive(service){

  if(!service){
    return false;
  }

  /*
   * Dropped is retained for older imported records.
   * Removed services keep only the obligation already earned,
   * so their adjusted totalPrice still counts financially.
   */
  if(
    String(service.status||'')
      .toLowerCase()==='dropped'
  ){
    return false;
  }

  if(
    service.classId &&
    classIsArchived(service.classId)
  ){
    return false;
  }

  return true;
}


function serviceKeepsStudentVisible(service){

  if(!service){
    return false;
  }

  const status=
    String(service.status||'')
      .trim()
      .toLowerCase();

  if(
    status==='removed' ||
    status==='dropped'
  ){
    return false;
  }

  if(
    service.classId &&
    classIsArchived(service.classId)
  ){
    return false;
  }

  return true;
}


function studentVisibleInServices(student){

  const list=
    services.filter(
      service=>
        service.studentId===student.id
    );

  /*
   * Standalone/manual students with no service yet remain visible.
   */
  if(!list.length){
    return true;
  }

  return list.some(
    serviceKeepsStudentVisible
  );
}


const currentClass=()=>classes.find(c=>c.id===$('#classSelect').value);

async function loadRoster(){
  let c=currentClass();

  if(!c){
    roster=[];
    return;
  }

  let s=await getDocs(
    collection(db,'vendors',user.uid,'classes',c.id,'students')
  );

  roster=s.docs.map(d=>({id:d.id,...d.data()}));
}

$('#saveClass').onclick=async()=>{
  let name=$('#className').value.trim();

  if(!name)return toast('Enter a class name.');

  let data={
    name,
    term:$('#classTerm').value.trim(),
    tuition:Number($('#classTuition').value)||null,
    location:$('#classLocation').value.trim(),
    activeStudentCount:0,
    createdAt:serverTimestamp()
  };

  let r=await addDoc(sub('classes'),data);

  await log('Class created',name,'Manual');
  await refreshAll();

  $('#classSelect').value=r.id;
  await loadRoster();
  renderRoster();

  $('#className').value='';
  $('#classTerm').value='';
  $('#classTuition').value='';
  $('#classLocation').value='';

  toast('Class saved.');
};

$('#classSelect').onchange=async()=>{
  preview=[];
  hide($('#previewCard'));
  await loadRoster();
  renderRoster();
};


function updateRosterUploadTarget(){

  const select=$('#classSelect');
  const csv=$('#csv');

  if(!select || !csv){
    return;
  }

  const selected=
    classes.find(c=>c.id===select.value) || null;

  let box=$('#rosterUploadTarget');

  if(!box){

    box=document.createElement('div');
    box.id='rosterUploadTarget';
    box.className='vf-roster-target';

    const drop=
      csv.closest('.drop') || csv.parentElement;

    if(drop?.parentElement){
      drop.parentElement.insertBefore(box,drop);
    }
  }

  const drop=csv.closest('.drop');

  if(!selected){

    box.className=
      'vf-roster-target vf-roster-target-empty';

    box.innerHTML=`
      <div class="vf-roster-target-label">
        ROSTER DESTINATION
      </div>
      <strong>Choose a class before uploading</strong>
      <span>
        VendorFlow will not accept a roster until the target class is selected.
      </span>
    `;

    csv.disabled=true;

    if(drop){
      drop.classList.add('vf-drop-disabled');
    }

    return;
  }

  const details=[
    selected.term,
    selected.location
  ].filter(Boolean).join(' · ');

  box.className=
    'vf-roster-target vf-roster-target-ready';

  box.innerHTML=`
    <div class="vf-roster-target-label">
      UPLOADING ROSTER TO
    </div>
    <strong>${esc(selected.name||'Selected class')}</strong>
    ${details ? `<span>${esc(details)}</span>` : ''}
    <div class="vf-roster-target-confirm">
      Any roster selected below will be imported into this class.
    </div>
  `;

  csv.disabled=false;

  if(drop){
    drop.classList.remove('vf-drop-disabled');
  }
}

if($('#classSelect')){
  $('#classSelect').addEventListener(
    'change',
    updateRosterUploadTarget
  );
}


function norm(v){
  return String(v||'').trim().toLowerCase();
}

function find(h,a){
  let n=h.map(norm);

  for(let x of a){
    let i=n.indexOf(norm(x));
    if(i>=0)return h[i];
  }

  return null;
}

function mapHeaders(h){
  let m={};

  for(let[k,a]of Object.entries(aliases)){
    let x=find(h,a);
    if(x)m[k]=x;
  }

  return m;
}

function val(r,k){
  return map[k]?String(r[map[k]]??'').trim():'';
}

function transform(r){
  let sf=val(r,'studentFirst'),
      sl=val(r,'studentLast'),
      pf=val(r,'parentFirst'),
      pl=val(r,'parentLast');

  return{
    registrationId:val(r,'registrationId'),
    status:val(r,'status')||'Active',
    studentFirst:sf,
    studentLast:sl,
    studentName:[sf,sl].filter(Boolean).join(' '),
    parentName:[pf,pl].filter(Boolean).join(' '),
    parentEmail:val(r,'parentEmail'),
    parentPhone:val(r,'parentPhone'),
    grade:val(r,'grade'),
    classTitle:val(r,'classTitle')
  };
}

function active(s){
  return ![
    'dropped',
    'cancelled',
    'canceled',
    'withdrawn',
    'inactive',
    'removed'
  ].includes(norm(s.status));
}

$('#csv').onchange=e=>{
  let f=e.target.files[0];

  if(!f)return;

  if(!currentClass())return toast('Choose a class first.');

  Papa.parse(f,{
    header:true,
    skipEmptyLines:'greedy',
    complete:r=>{
      headers=r.meta.fields||[];
      map=mapHeaders(headers);

      preview=(r.data||[])
        .map(transform)
        .filter(x=>x.studentName||x.parentEmail);

      $('#csvStatus').textContent=
        `${f.name}: ${preview.length} usable rows found.`;

      renderPreview();
    }
  });
};

function renderPreview(){
  show($('#previewCard'));

  $('#mapping').textContent=
    `${preview.length} rows found. VendorFlow recognized ${Object.keys(map).length} useful fields.`;

  $('#previewBody').innerHTML=
    preview.map(s=>
      `<tr>
        <td>${esc(s.studentName)}</td>
        <td>${esc(s.parentName)}</td>
        <td>${esc(s.parentEmail)}</td>
        <td>${esc(s.parentPhone)}</td>
        <td>${esc(s.status)}</td>
        <td>${esc(s.grade)}</td>
      </tr>`
    ).join('');

  let issues=[];

  if(!map.studentFirst||!map.studentLast){
    issues.push('Student name columns were not fully recognized.');
  }

  if(issues.length){
    $('#warnings').textContent=issues.join(' ');
    show($('#warnings'));
  }else{
    hide($('#warnings'));
  }
}

$('#saveRoster').onclick=async()=>{
  let c=currentClass();

  if(!c||!preview.length)return;

  let col=collection(db,'vendors',user.uid,'classes',c.id,'students'),
      old=await getDocs(col),
      b=writeBatch(db);

  old.forEach(d=>b.delete(d.ref));

  preview.forEach(s=>
    b.set(
      doc(col),
      {
        ...s,
        source:'CSV import',
        createdAt:serverTimestamp()
      }
    )
  );

  let count=preview.filter(active).length;

  b.update(
    doc(db,'vendors',user.uid,'classes',c.id),
    {
      activeStudentCount:count,
      rosterCount:preview.length,
      lastImportAt:serverTimestamp()
    }
  );

  await b.commit();

  await syncRosterToCoreRecords(c,preview);

  await log(
    'Roster imported',
    `${preview.length} students imported into ${c.name}; ${count} active.`,
    'CSV import'
  );

  await refreshAll();

  $('#classSelect').value=c.id;

  await loadRoster();
  renderRoster();

  toast('Roster saved.');
};


function renderArchivedClasses(){

  const list=
    $('#archivedClassesList');

  if(!list){
    return;
  }


  const archived=
    classes
      .filter(c=>c.archived)
      .sort(
        (a,b)=>
          (a.name||'')
            .localeCompare(b.name||'')
      );


  if(!archived.length){

    list.innerHTML=
      '<div class="empty">No archived classes.</div>';

    return;
  }


  list.innerHTML=
    archived.map(c=>`

      <div class="vf-archived-class">

        <div>

          <strong>
            ${esc(c.name||'Unnamed class')}
          </strong>

          <div class="meta">
            ${esc(c.term||'')}
            ${c.location
              ? ' · '+esc(c.location)
              : ''}
            · ${Number(c.rosterCount||0)} roster records
          </div>

        </div>


        <div class="vf-archived-actions">

          <button
            data-view-archived="${c.id}">
            View roster
          </button>

          <button
            class="primary"
            data-unarchive-class="${c.id}">
            Unarchive
          </button>

        </div>

      </div>

    `).join('');


  $$('[data-view-archived]')
    .forEach(button=>{

      button.onclick=()=>{

        viewArchivedRoster(
          button.dataset.viewArchived
        );
      };
    });


  $$('[data-unarchive-class]')
    .forEach(button=>{

      button.onclick=()=>{

        unarchiveClass(
          button.dataset.unarchiveClass
        );
      };
    });
}


async function viewArchivedRoster(classId){

  const c=
    classes.find(
      item=>item.id===classId
    );

  if(!c){
    return;
  }


  const snap=
    await getDocs(
      collection(
        db,
        'vendors',
        user.uid,
        'classes',
        c.id,
        'students'
      )
    );


  const members=
    snap.docs.map(
      d=>({
        id:d.id,
        ...d.data()
      })
    );


  const viewer=
    $('#archivedRosterViewer');


  viewer.innerHTML=`

    <div class="row between">

      <div>
        <div class="eyebrow">
          Archived roster
        </div>

        <h2>
          ${esc(c.name)}
        </h2>

        <p>
          ${esc(c.term||'')}
          ${c.location
            ? ' · '+esc(c.location)
            : ''}
        </p>
      </div>

      <button
        data-close-archived-roster>
        Close
      </button>

    </div>


    ${members.length
      ? `
        <div class="tablewrap">

          <table>

            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>Email</th>
                <th>Status</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>

              ${members.map(s=>`
                <tr>
                  <td>${esc(s.studentName||'')}</td>
                  <td>${esc(s.parentName||'')}</td>
                  <td>${esc(s.parentEmail||'')}</td>
                  <td>${esc(s.status||'')}</td>
                  <td>${esc(s.grade||'')}</td>
                </tr>
              `).join('')}

            </tbody>

          </table>

        </div>
      `
      : '<div class="empty">No roster records.</div>'
    }

  `;


  show(viewer);


  const close=
    viewer.querySelector(
      '[data-close-archived-roster]'
    );

  if(close){
    close.onclick=()=>hide(viewer);
  }
}


async function unarchiveClass(classId){

  const c=
    classes.find(
      item=>item.id===classId
    );

  if(!c){
    return;
  }


  const ok=
    confirm(
      `Unarchive ${c.name}?\n\n` +
      `The class will return to your active Class Rosters and its ` +
      `students/services will become active in VendorFlow again.`
    );


  if(!ok){
    return;
  }


  await updateDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'classes',
      c.id
    ),
    {
      archived:false,
      unarchivedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );


  await log(
    'Class unarchived',
    `${c.name} returned to active Class Rosters.`,
    'Manual'
  );


  await refreshAll();

  renderArchivedClasses();

  toast(
    `${c.name} unarchived.`
  );
}


if($('#toggleArchivedClasses')){

  $('#toggleArchivedClasses').onclick=()=>{

    const panel=
      $('#archivedClassesPanel');

    panel.classList.toggle(
      'hidden'
    );


    if(
      !panel.classList.contains(
        'hidden'
      )
    ){

      renderArchivedClasses();

      $('#toggleArchivedClasses')
        .textContent=
          'Hide archived classes';

    }else{

      $('#toggleArchivedClasses')
        .textContent=
          'Show archived classes';
    }
  };
}



function renderRoster(){
  let c=currentClass();

  if(!c){
    show($('#rosterEmpty'));
    hide($('#rosterWrap'));
    hide($('#addStudent'));
    hide($('#archiveClass'));
    return;
  }

  show($('#addStudent'));
  show($('#archiveClass'));

  if(!roster.length){
    $('#rosterEmpty').textContent='No saved roster yet.';
    show($('#rosterEmpty'));
    hide($('#rosterWrap'));
    return;
  }

  hide($('#rosterEmpty'));
  show($('#rosterWrap'));

  $('#rosterBody').innerHTML=
    roster.map(s=>
      `<tr>
        <td>${esc(s.studentName)}</td>
        <td>${esc(s.parentName)}</td>
        <td>${esc(s.parentEmail)}</td>
        <td>${esc(s.parentPhone||'')}</td>
        <td>${esc(s.status)}</td>
        <td>${esc(s.grade)}</td>
        <td>
          <div class="vf-roster-actions">

            <button
              class="primary"
              data-edit-student="${s.id}">
              Edit student
            </button>

          </div>
        </td>
      </tr>`
    ).join('');

  $$('[data-edit-student]').forEach(
    b=>b.onclick=()=>editRosterStudent(b.dataset.editStudent)
  );

}


async function dropStudentFromClass(id){

  const s=
    roster.find(x=>x.id===id);

  const c=
    currentClass();

  if(!s || !c){
    return;
  }

  const ok=
    confirm(
      `Remove ${s.studentName} from ${c.name}?\n\n` +
      `VendorFlow will mark this enrollment Dropped. ` +
      `The student's payment, certificate and account history will NOT be deleted.`
    );

  if(!ok){
    return;
  }

  await updateDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'classes',
      c.id,
      'students',
      id
    ),
    {
      status:'Dropped',
      droppedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );

  await loadRoster();

  const count=
    roster.filter(active).length;

  await updateDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'classes',
      c.id
    ),
    {
      activeStudentCount:count,
      rosterCount:roster.length
    }
  );

  /*
   * Preserve the core student and all financial records.
   * If a linked class service exists, mark only that
   * service/enrollment inactive rather than deleting it.
   */
  const core=
    students.find(
      x=>
        normalizedName(x.studentName)===
        normalizedName(s.studentName)
    );

  if(core){

    const linked=
      services.filter(
        service=>
          service.studentId===core.id &&
          service.classId===c.id &&
          norm(service.status)!=='dropped'
      );

    for(const service of linked){

      await updateDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'services',
          service.id
        ),
        {
          status:'Dropped',
          droppedAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        }
      );
    }
  }

  await log(
    'Student dropped from class',
    `${s.studentName} removed from ${c.name}. Financial history preserved.`,
    'Manual'
  );

  await refreshAll();

  $('#classSelect').value=c.id;

  await loadRoster();
  renderRoster();
  updateRosterUploadTarget();

  toast(`${s.studentName} marked Dropped.`);
}


async function changeStatus(id){
  let s=roster.find(x=>x.id===id);

  let n=prompt(
    `Status for ${s.studentName}:`,
    s.status
  );

  if(!n)return;

  let c=currentClass();

  await updateDoc(
    doc(db,'vendors',user.uid,'classes',c.id,'students',id),
    {status:n}
  );

  await loadRoster();

  let count=roster.filter(active).length;

  await updateDoc(
    doc(db,'vendors',user.uid,'classes',c.id),
    {activeStudentCount:count}
  );

  await log(
    'Student status changed',
    `${s.studentName}: ${s.status} → ${n} in ${c.name}.`,
    'Manual'
  );

  await refreshAll();

  $('#classSelect').value=c.id;

  await loadRoster();
  renderRoster();
}




function updateStudentStatusHelp(){

  const box=
    $('#studentStatusHelp');

  if(!box){
    return;
  }

  const status=
    $('#ss').value;


  if(status==='Inactive'){

    box.className=
      'vf-student-status-help vf-status-warning';

    box.innerHTML=`
      <strong>Inactive:</strong>
      The student is no longer participating, but the existing
      class payment obligation remains.
    `;

    return;
  }


  if(status==='Removed'){

    box.className=
      'vf-student-status-help vf-status-danger';

    box.innerHTML=`
      <strong>Removed:</strong>
      The student leaves the active class roster and VendorFlow
      removes the remaining unpaid class obligation.
      Prior payments, certificates and history are preserved.
    `;

    return;
  }


  box.className=
    'vf-student-status-help vf-status-normal';

  box.innerHTML=`
    <strong>Active:</strong>
    The student is participating and the normal class
    payment obligation remains.
  `;
}


if($('#ss')){

  $('#ss').addEventListener(
    'change',
    updateStudentStatusHelp
  );
}


function resetRosterStudentForm(){

  editingRosterStudentId=null;

  $('#sf').value='';
  $('#sl').value='';
  $('#pn').value='';
  $('#pe').value='';
  $('#pp').value='';
  $('#sg').value='';
  $('#ss').value='Active';

  updateStudentStatusHelp();

  $('#saveStudent').textContent=
    'Save student';
}


function editRosterStudent(id){

  const s=
    roster.find(
      student=>student.id===id
    );

  if(!s){
    return;
  }

  editingRosterStudentId=id;

  $('#sf').value=
    s.studentFirst||'';

  $('#sl').value=
    s.studentLast||'';

  $('#pn').value=
    s.parentName||'';

  $('#pe').value=
    s.parentEmail||'';

  $('#pp').value=
    s.parentPhone||'';

  $('#sg').value=
    s.grade||'';

  const oldStatus=
    String(s.status||'Active')
      .trim()
      .toLowerCase();

  $('#ss').value=
    oldStatus==='active'
      ? 'Active'
      : (
          oldStatus==='removed' ||
          oldStatus==='dropped'
            ? 'Removed'
            : 'Inactive'
        );

  updateStudentStatusHelp();

  $('#saveStudent').textContent=
    'Save changes';

  show(
    $('#studentForm')
  );

  $('#sf').focus();
}


$('#cancelStudent').onclick=()=>{

  resetRosterStudentForm();

  hide(
    $('#studentForm')
  );
};


$('#addStudent').onclick=()=>{

  resetRosterStudentForm();

  show(
    $('#studentForm')
  );
};


async function applyRosterFinancialStatus(
  classRecord,
  rosterRecord,
  newStatus
){

  const coreId=
    rosterRecord?.coreStudentId ||
    students.find(
      student=>
        normalizedName(student.studentName)===
        normalizedName(rosterRecord.studentName)
    )?.id ||
    '';

  if(!coreId){
    return;
  }


  const coreStudent=
    students.find(
      student=>student.id===coreId
    );

  const linked=
    services.filter(
      service=>
        service.studentId===coreId &&
        service.classId===classRecord.id
    );


  if(!linked.length){
    return;
  }


  /*
   * Active / Inactive:
   * participation changes but obligation remains intact.
   */
  if(
    newStatus==='Active' ||
    newStatus==='Inactive'
  ){

    for(const service of linked){

      let update={
        status:newStatus,
        updatedAt:serverTimestamp()
      };


      /*
       * If a Removed student is restored, restore the
       * original class price as well.
       */
      if(
        String(service.status||'')
          .toLowerCase()==='removed' &&
        Number(service.originalTotalPrice)>0
      ){

        update.totalPrice=
          Number(service.originalTotalPrice);

        update.waivedAmount=0;

        update.financialDisposition=
          'Normal obligation restored';
      }


      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'services',
          service.id
        ),
        update,
        {
          merge:true
        }
      );
    }

    return;
  }


  if(newStatus!=='Removed'){
    return;
  }


  /*
   * REMOVED:
   *
   * Waive only the REMAINING UNPAID portion.
   * This avoids creating an artificial refund for money
   * the family already paid or funded with a certificate.
   */
  const account=
    coreStudent
      ? studentAccountTotals(coreStudent)
      : null;

  let remainingUnpaid=
    Math.max(
      0,
      Number(
        account?.parentBalance||0
      )
    );


  for(const service of linked){

    const currentPrice=
      Number(service.totalPrice||0);

    const originalPrice=
      Number(
        service.originalTotalPrice ||
        currentPrice
      );

    const waiver=
      Math.min(
        currentPrice,
        remainingUnpaid
      );

    const adjustedPrice=
      Math.max(
        0,
        currentPrice-waiver
      );


    remainingUnpaid=
      Math.max(
        0,
        remainingUnpaid-waiver
      );


    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'services',
        service.id
      ),
      {
        status:'Removed',

        originalTotalPrice:
          originalPrice,

        totalPrice:
          adjustedPrice,

        waivedAmount:
          Number(service.waivedAmount||0)+waiver,

        financialDisposition:
          'Remaining unpaid obligation removed',

        removedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );
  }
}


$('#saveStudent').onclick=async()=>{

  const c=
    currentClass();

  const sf=
    $('#sf').value.trim();

  const sl=
    $('#sl').value.trim();


  if(
    !c ||
    !sf ||
    !sl
  ){
    return toast(
      'Enter student first and last name.'
    );
  }


  const requestedStatus=
    $('#ss').value;


  if(
    editingRosterStudentId &&
    requestedStatus==='Inactive'
  ){

    const ok=
      confirm(
        'Mark this student Inactive?\n\n' +
        'The student will no longer be participating, but their ' +
        'existing class payment obligation will remain.'
      );

    if(!ok){
      return;
    }
  }


  if(
    editingRosterStudentId &&
    requestedStatus==='Removed'
  ){

    const ok=
      confirm(
        'Remove this student from the class?\n\n' +
        'VendorFlow will remove the remaining unpaid class obligation. ' +
        'Prior payments, certificates and history will be preserved.'
      );

    if(!ok){
      return;
    }
  }


  const data={

    studentFirst:sf,

    studentLast:sl,

    studentName:
      `${sf} ${sl}`,

    parentName:
      $('#pn').value.trim(),

    parentEmail:
      $('#pe').value.trim(),

    parentPhone:
      $('#pp').value.trim(),

    grade:
      $('#sg').value.trim(),

    status:
      $('#ss').value,

    source:'Manual',

    updatedAt:
      serverTimestamp()
  };


  if(editingRosterStudentId){

    const existing=
      roster.find(
        student=>
          student.id===
          editingRosterStudentId
      );


    if(!existing){
      return toast(
        'Student record was not found.'
      );
    }


    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'classes',
        c.id,
        'students',
        existing.id
      ),
      data,
      {
        merge:true
      }
    );


    const coreId=
      existing.coreStudentId;


    if(coreId){

      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'students',
          coreId
        ),
        {
          studentFirst:
            data.studentFirst,

          studentLast:
            data.studentLast,

          studentName:
            data.studentName,

          parentName:
            data.parentName,

          parentEmail:
            data.parentEmail,

          parentPhone:
            data.parentPhone,

          grade:
            data.grade,

          active:
            active(data),

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );


      const linkedServices=
        services.filter(
          service=>
            service.studentId===coreId
        );


      for(
        const service of
        linkedServices
      ){

        await setDoc(
          doc(
            db,
            'vendors',
            user.uid,
            'services',
            service.id
          ),
          {
            studentName:
              data.studentName,

            updatedAt:
              serverTimestamp()
          },
          {
            merge:true
          }
        );
      }

    }else{

      await syncRosterToCoreRecords(
        c,
        [{
          id:existing.id,
          ...existing,
          ...data
        }]
      );
    }


    await applyRosterFinancialStatus(
      c,
      {
        ...existing,
        ...data
      },
      data.status
    );


    await log(
      'Student updated',
      `${existing.studentName} updated in ${c.name}.`,
      'Manual'
    );


  }else{

    const ref=
      await addDoc(
        collection(
          db,
          'vendors',
          user.uid,
          'classes',
          c.id,
          'students'
        ),
        {
          ...data,
          createdAt:
            serverTimestamp()
        }
      );


    await syncRosterToCoreRecords(
      c,
      [{
        id:ref.id,
        ...data
      }]
    );


    await log(
      'Student added',
      `${data.studentName} added to ${c.name}.`,
      'Manual'
    );
  }


  await loadRoster();


  await updateDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'classes',
      c.id
    ),
    {
      activeStudentCount:
        roster.filter(active).length,

      rosterCount:
        roster.length,

      updatedAt:
        serverTimestamp()
    }
  );


  await refreshAll();

  $('#classSelect').value=
    c.id;

  await loadRoster();

  renderRoster();

  const wasEditing=
    Boolean(editingRosterStudentId);

  resetRosterStudentForm();

  hide(
    $('#studentForm')
  );


  toast(
    wasEditing
      ? 'Student updated.'
      : 'Student saved.'
  );
};



$('#archiveClass').onclick=async()=>{

  const c=
    currentClass();

  if(!c){
    return;
  }


  const ok=
    confirm(
      `Archive ${c.name}?\n\n` +
      `This will remove the class from your active Class Rosters. ` +
      `Students whose only active service is this class will no longer ` +
      `appear in Students & Services.\n\n` +
      `Payments, certificates, financial history and the full roster ` +
      `will NOT be deleted. You can unarchive the class later.`
    );


  if(!ok){
    return;
  }


  await updateDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'classes',
      c.id
    ),
    {
      archived:true,
      archivedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );


  await log(
    'Class archived',
    `${c.name} was archived. Roster and financial history preserved.`,
    'Manual'
  );


  $('#classSelect').value='';

  roster=[];

  await refreshAll();

  renderArchivedClasses();

  toast(
    `${c.name} archived.`
  );
};






/* ==========================================================
   STUDENTS, SERVICES & FUNDING
   ========================================================== */

function money(v){
  return Number(v||0).toLocaleString(
    undefined,
    {
      style:'currency',
      currency:'USD'
    }
  );
}


function normalizedName(v){
  return String(v||'')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,' ');
}


function coreStudentById(id){
  return students.find(
    s=>s.id===id
  );
}


function studentServices(studentId){
  return services.filter(
    s=>s.studentId===studentId
  );
}


function refreshStudentServiceSelectors(){

  const studentSelect=$('#serviceStudent');

  if(studentSelect){

    const selected=studentSelect.value;

    studentSelect.innerHTML=
      '<option value="">Choose student</option>'+
      [...students]
        .sort(
          (a,b)=>
            (a.studentName||'')
              .localeCompare(b.studentName||'')
        )
        .map(
          s=>
            `<option value="${s.id}">
              ${esc(s.studentName||'Unnamed student')}
            </option>`
        )
        .join('');

    if(students.some(s=>s.id===selected)){
      studentSelect.value=selected;
    }
  }


  const classSelect=$('#serviceClass');

  if(classSelect){

    const selected=classSelect.value;

    classSelect.innerHTML=
      '<option value="">Not linked to a roster class</option>'+
      [...classes]
        .sort(
          (a,b)=>
            (a.name||'')
              .localeCompare(b.name||'')
        )
        .map(
          c=>
            `<option value="${c.id}">
              ${esc(c.name||'Class')}
              ${c.term?' — '+esc(c.term):''}
            </option>`
        )
        .join('');

    if(classes.some(c=>c.id===selected)){
      classSelect.value=selected;
    }
  }
}




function refundableParentAmount(student){

  if(!student){
    return 0;
  }

  /*
   * Parent-paid transactions only.
   * Negative amounts are prior refunds, so they naturally
   * reduce the remaining refundable total.
   */
  return Math.max(
    0,
    studentPayments(student)
      .filter(
        payment=>
          String(payment.method||'')
            .toLowerCase()!=='charter payment'
      )
      .reduce(
        (sum,payment)=>
          sum+Number(payment.amount||0),
        0
      )
  );
}


function renderRefundStudentSelect(){

  const select=
    $('#refundStudent');

  if(!select){
    return;
  }

  const current=
    select.value;

  select.innerHTML=
    '<option value="">Choose student</option>'+
    students
      .filter(studentVisibleInServices)
      .sort(
        (a,b)=>
          (a.studentName||'')
            .localeCompare(
              b.studentName||''
            )
      )
      .map(
        student=>
          `<option value="${student.id}">
            ${esc(student.studentName||'Unnamed student')}
            ${student.parentName
              ? ' — '+esc(student.parentName)
              : ''}
          </option>`
      )
      .join('');

  if(
    students.some(
      student=>student.id===current
    )
  ){
    select.value=current;
  }

  updateRefundAvailable();
}


function updateRefundAvailable(){

  const box=
    $('#refundAvailable');

  const select=
    $('#refundStudent');

  if(!box || !select){
    return;
  }

  const student=
    students.find(
      item=>item.id===select.value
    );

  if(!student){

    box.className=
      'vf-refund-available';

    box.textContent=
      'Choose a student to see refundable parent payments.';

    return;
  }

  const available=
    refundableParentAmount(
      student
    );

  box.className=
    available>0
      ? 'vf-refund-available vf-refund-positive'
      : 'vf-refund-available vf-refund-zero';

  box.innerHTML=
    `<strong>${money(available)}</strong>
     currently available from recorded parent payments.`;
}


function resetRefundForm(){

  $('#refundStudent').value='';
  $('#refundDate').value='';
  $('#refundAmount').value='';
  $('#refundMethod').value='Venmo';
  $('#refundReason').value='Overpayment';
  $('#refundNote').value='';
  $('#refundOverride').checked=false;

  updateRefundAvailable();
}


function studentPayments(student){

  const targetId=student?.id||'';
  const targetName=
    normalizedName(student?.studentName||'');

  const parentName=
    normalizedName(student?.parentName||'');

  return payments.filter(p=>{

    if(targetId && p.studentId===targetId){
      return true;
    }

    const paymentStudent=
      normalizedName(p.student||'');

    const paymentPayer=
      normalizedName(p.payer||'');

    if(paymentStudent && paymentStudent===targetName){
      return true;
    }

    if(
      !p.studentId &&
      parentName &&
      paymentPayer===parentName
    ){
      return true;
    }

    return false;
  });
}


function studentCertificates(studentName){

  const target=normalizedName(studentName);

  return certs.filter(
    c=>normalizedName(c.student)===target
  );
}


function studentAccountTotals(student){

  const serviceList=
    studentServices(student.id)
      .filter(serviceCountsAsActive);

  const totalDue=
    serviceList.reduce(
      (sum,s)=>
        sum+Number(s.totalPrice||0),
      0
    );


  const paymentList=
    studentPayments(student);


  const parentPayments=
    paymentList
      .filter(
        p=>
          String(p.method||'')
            .toLowerCase()!=='charter payment'
      )
      .reduce(
        (sum,p)=>
          sum+Number(p.amount||0),
        0
      );


  const charterPayments=
    paymentList
      .filter(
        p=>
          String(p.method||'')
            .toLowerCase()==='charter payment'
      )
      .reduce(
        (sum,p)=>
          sum+Number(p.amount||0),
        0
      );


  const certificateTotal=
    studentCertificates(student.studentName)
      .filter(
        c=>
          String(c.status||'')
            .toLowerCase()!=='cancelled'
      )
      .reduce(
        (sum,c)=>
          sum+Number(c.amount||0),
        0
      );


  const parentBalance=
    totalDue-
    parentPayments-
    certificateTotal;


  const charterReceivable=
    Math.max(
      0,
      certificateTotal-charterPayments
    );


  return {
    totalDue,
    parentPayments,
    charterPayments,
    certificateTotal,
    parentBalance,
    charterReceivable
  };
}


function balanceStatus(balance){

  if(balance < -.009){
    return {
      label:`${money(Math.abs(balance))} credit`,
      className:'vf-credit-pill'
    };
  }

  if(balance > .009){
    return {
      label:`${money(balance)} still due`,
      className:'vf-due-pill'
    };
  }

  return {
    label:'Parent paid',
    className:'vf-paid-pill'
  };
}



function studentSearchHaystack(student){

  return [
    student.studentName,
    student.studentFirst,
    student.studentLast,
    student.parentName,
    student.parentEmail,
    student.parentPhone,
    student.grade
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}


function renderGlobalStudentSearch(){

  const input=
    $('#globalStudentSearch');

  const results=
    $('#globalStudentSearchResults');

  if(!input || !results){
    return;
  }

  const query=
    String(input.value||'')
      .trim()
      .toLowerCase();

  if(!query){

    results.innerHTML='';
    hide(results);
    return;
  }


  const matches=
    students
      .filter(
        student=>
          studentSearchHaystack(student)
            .includes(query)
      )
      .sort(
        (a,b)=>
          (a.studentName||'')
            .localeCompare(
              b.studentName||''
            )
      )
      .slice(0,20);


  if(!matches.length){

    results.innerHTML=`
      <div class="vf-search-empty">
        No matching students found.
      </div>
    `;

    show(results);
    return;
  }


  results.innerHTML=
    matches.map(student=>{

      const linkedServices=
        studentServices(student.id)
          .filter(serviceKeepsStudentVisible);

      const classNames=
        linkedServices
          .map(
            service=>
              service.name ||
              service.serviceType ||
              ''
          )
          .filter(Boolean)
          .join(' · ');

      return `
        <button
          type="button"
          class="vf-global-student-result"
          data-global-student="${student.id}">

          <div class="vf-global-student-main">

            <strong>
              ${esc(student.studentName||'Unnamed student')}
            </strong>

            <span>
              ${esc(student.parentName||'')}
              ${student.parentEmail
                ? ' · '+esc(student.parentEmail)
                : ''}
              ${student.parentPhone
                ? ' · '+esc(student.parentPhone)
                : ''}
            </span>

            ${classNames
              ? `<small>${esc(classNames)}</small>`
              : ''}

          </div>

          <span class="vf-global-edit-label">
            Edit
          </span>

        </button>
      `;
    }).join('');


  $$('[data-global-student]')
    .forEach(button=>{

      button.onclick=()=>{

        openGlobalStudentEdit(
          button.dataset.globalStudent
        );
      };
    });


  show(results);
}


async function openGlobalStudentEdit(studentId){

  const student=
    students.find(
      item=>item.id===studentId
    );

  if(!student){
    return;
  }


  /*
   * Prefer a current active roster record so edits continue
   * through the existing roster-edit workflow.
   */
  const linkedServices=
    studentServices(student.id)
      .filter(
        service=>
          service.classId &&
          serviceKeepsStudentVisible(service)
      );


  if(linkedServices.length){

    const service=
      linkedServices[0];

    const c=
      classes.find(
        item=>item.id===service.classId
      );


    if(c){

      $('#classSelect').value=
        c.id;

      await loadRoster();

      const rosterMatch=
        roster.find(
          row=>
            row.coreStudentId===student.id ||
            normalizedName(row.studentName)===
            normalizedName(student.studentName)
        );


      if(rosterMatch){

        switchView('classes');

        editRosterStudent(
          rosterMatch.id
        );

        hide(
          $('#globalStudentSearchResults')
        );

        return;
      }
    }
  }


  /*
   * If the student has no current roster class,
   * edit the core record directly.
   */
  openCoreStudentEdit(
    student.id
  );
}


function openCoreStudentEdit(studentId){

  const student=
    students.find(
      item=>item.id===studentId
    );

  if(!student){
    return;
  }


  let form=
    $('#globalCoreStudentEditForm');


  if(!form){

    form=
      document.createElement('div');

    form.id=
      'globalCoreStudentEditForm';

    form.className=
      'card vf-global-core-edit';

    form.innerHTML=`

      <div class="row between">

        <div>
          <div class="eyebrow">
            Edit student
          </div>

          <h2>
            Student & parent details
          </h2>
        </div>

        <button
          type="button"
          id="closeGlobalCoreEdit">
          Close
        </button>

      </div>


      <div class="formgrid vf-form-2">

        <input
          id="gStudentFirst"
          class="input"
          placeholder="Student first name">

        <input
          id="gStudentLast"
          class="input"
          placeholder="Student last name">

        <input
          id="gParentName"
          class="input"
          placeholder="Parent / guardian">

        <input
          id="gParentEmail"
          class="input"
          type="email"
          placeholder="Parent email">

        <input
          id="gParentPhone"
          class="input"
          placeholder="Parent phone">

        <input
          id="gStudentGrade"
          class="input"
          placeholder="Grade">

      </div>


      <div class="row">

        <button
          id="saveGlobalCoreEdit"
          class="primary">
          Save changes
        </button>

      </div>
    `;


    const studentsView=
      $('#studentsView');

    studentsView.insertBefore(
      form,
      $('#studentsServicesList')
    );
  }


  form.dataset.studentId=
    student.id;


  $('#gStudentFirst').value=
    student.studentFirst||'';

  $('#gStudentLast').value=
    student.studentLast||'';

  $('#gParentName').value=
    student.parentName||'';

  $('#gParentEmail').value=
    student.parentEmail||'';

  $('#gParentPhone').value=
    student.parentPhone||'';

  $('#gStudentGrade').value=
    student.grade||'';


  $('#closeGlobalCoreEdit').onclick=()=>{

    form.remove();
  };


  $('#saveGlobalCoreEdit').onclick=async()=>{

    const current=
      students.find(
        item=>
          item.id===
          form.dataset.studentId
      );

    if(!current){
      return;
    }


    const first=
      $('#gStudentFirst').value.trim();

    const last=
      $('#gStudentLast').value.trim();


    if(!first || !last){

      return toast(
        'Enter student first and last name.'
      );
    }


    const updated={

      studentFirst:first,

      studentLast:last,

      studentName:
        `${first} ${last}`,

      parentName:
        $('#gParentName').value.trim(),

      parentEmail:
        $('#gParentEmail').value.trim(),

      parentPhone:
        $('#gParentPhone').value.trim(),

      grade:
        $('#gStudentGrade').value.trim(),

      updatedAt:
        serverTimestamp()
    };


    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'students',
        current.id
      ),
      updated,
      {
        merge:true
      }
    );


    /*
     * Propagate contact/name edits to linked roster records.
     */
    for(const c of classes){

      const snap=
        await getDocs(
          collection(
            db,
            'vendors',
            user.uid,
            'classes',
            c.id,
            'students'
          )
        );


      for(const rosterDoc of snap.docs){

        const row=
          rosterDoc.data();

        if(
          row.coreStudentId===current.id ||
          normalizedName(row.studentName)===
          normalizedName(current.studentName)
        ){

          await setDoc(
            rosterDoc.ref,
            {
              studentFirst:
                updated.studentFirst,

              studentLast:
                updated.studentLast,

              studentName:
                updated.studentName,

              parentName:
                updated.parentName,

              parentEmail:
                updated.parentEmail,

              parentPhone:
                updated.parentPhone,

              grade:
                updated.grade,

              coreStudentId:
                current.id,

              updatedAt:
                serverTimestamp()
            },
            {
              merge:true
            }
          );
        }
      }
    }


    /*
     * Keep linked services displaying the corrected student name.
     */
    const linked=
      services.filter(
        service=>
          service.studentId===current.id
      );


    for(const service of linked){

      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'services',
          service.id
        ),
        {
          studentName:
            updated.studentName,

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );
    }


    await log(
      'Student updated',
      `${current.studentName} contact information was updated.`,
      'Manual'
    );


    form.remove();

    await refreshAll();

    $('#globalStudentSearch').value=
      updated.studentName;

    renderGlobalStudentSearch();

    toast(
      'Student updated.'
    );
  };
}


if($('#globalStudentSearch')){

  $('#globalStudentSearch')
    .addEventListener(
      'input',
      renderGlobalStudentSearch
    );
}



function renderStudentsServices(){

  refreshStudentServiceSelectors();

  renderGlobalStudentSearch();

  const count=$('#coreStudentCount');

  if(count){
    count.textContent=
      `${students.filter(studentVisibleInServices).length} student${students.filter(studentVisibleInServices).length===1?'':'s'}`;
  }


  const list=$('#studentsServicesList');

  if(!list) return;


  if(!students.length){

    list.innerHTML=`
      <div class="empty">
        No students yet. Import a roster or add a student manually.
      </div>
    `;

    return;
  }


  list.innerHTML=
    students
      .filter(studentVisibleInServices)
      .sort(
        (a,b)=>
          (a.studentName||'')
            .localeCompare(b.studentName||'')
      )
      .map(student=>{

        const account=
          studentAccountTotals(student);

        const balance=
          balanceStatus(account.parentBalance);

        const serviceList=
          studentServices(student.id);


        const serviceHTML=
          serviceList.length

            ? serviceList.map(service=>`

                <div class="vf-service-row">

                  <div class="vf-service-main">

                    <div class="vf-service-name">
                      ${esc(
                        service.name ||
                        service.serviceType ||
                        'Service'
                      )}
                    </div>

                    <div class="vf-service-meta">

                      <span>
                        ${esc(service.serviceType||'Service')}
                      </span>

                      ${service.status
                        ? `<span>${esc(service.status)}</span>`
                        : ''}

                      ${service.schedule
                        ? `<span>${esc(service.schedule)}</span>`
                        : ''}

                      ${service.serviceType==='Tutoring' &&
                        Number(service.tutoringRate||0)>0
                        ? `<span>
                            ${money(service.tutoringRate)} rate
                           </span>`
                        : ''}

                      ${service.schedule==='Monthly'
                        ? `<span>
                            Due by the
                            ${esc(service.dueDay||4)}th
                           </span>`
                        : ''}

                      ${Number(service.lateFee||0)>0
                        ? `<span>
                            ${money(service.lateFee)} late fee
                           </span>`
                        : ''}

                    </div>

                  </div>


                  <div class="vf-service-money">

                    <div>
                      <small>Service price</small>
                      <strong>
                        ${money(service.totalPrice)}
                      </strong>
                    </div>

                  </div>

                </div>

              `).join('')

            : `
                <div class="vf-service-empty">
                  No service has been added yet.
                </div>
              `;


        return `
          <div class="vf-student-account">

            <div class="vf-student-head">

              <div>

                <h3>
                  ${esc(student.studentName||'Unnamed student')}
                </h3>

                <div class="vf-student-meta">

                  ${student.parentName
                    ? `<span>${esc(student.parentName)}</span>`
                    : ''}

                  ${student.parentEmail
                    ? `<span>${esc(student.parentEmail)}</span>`
                    : ''}

                  ${student.parentPhone
                    ? `<span>${esc(student.parentPhone)}</span>`
                    : ''}

                  ${student.grade
                    ? `<span>Grade ${esc(student.grade)}</span>`
                    : ''}

                  ${student.source
                    ? `<span>
                        Added by ${esc(student.source)}
                       </span>`
                    : ''}

                </div>

              </div>

              <button
                class="vf-small-button"
                data-add-service-student="${student.id}">
                Add service
              </button>

            </div>


            <div class="vf-account-summary">

              <div>
                <small>Services</small>
                <strong>
                  ${money(account.totalDue)}
                </strong>
              </div>

              <div>
                <small>Parent payments</small>
                <strong>
                  ${money(account.parentPayments)}
                </strong>
              </div>

              <div>
                <small>Certificates</small>
                <strong>
                  ${money(account.certificateTotal)}
                </strong>
              </div>

              <div>
                <small>Parent balance</small>
                <strong>
                  ${money(account.parentBalance)}
                </strong>
              </div>

              <span class="${balance.className}">
                ${esc(balance.label)}
              </span>

            </div>


            ${account.charterReceivable>0
              ? `
                <div class="vf-charter-receivable">
                  Charter receivable:
                  <strong>
                    ${money(account.charterReceivable)}
                  </strong>
                  — parent obligation has already been satisfied
                  by the certificate.
                </div>
              `
              : ''}


            ${account.parentBalance < -.009
              ? `
                <div class="vf-refund-alert">
                  <strong>Possible refund / credit:</strong>
                  This account has
                  ${money(Math.abs(account.parentBalance))}
                  more credited than the current service charges.
                  Review before refunding.
                </div>
              `
              : ''}


            <div class="vf-services">
              ${serviceHTML}
            </div>

          </div>
        `;
      })
      .join('');


  $$('[data-add-service-student]')
    .forEach(btn=>{

      btn.onclick=()=>{

        refreshStudentServiceSelectors();

        $('#serviceStudent').value=
          btn.dataset.addServiceStudent;

        show($('#serviceForm'));

        $('#serviceForm')
          .scrollIntoView({
            behavior:'smooth',
            block:'start'
          });
      };
    });
}



/* ----------------------------------------------------------
   Manual student
   ---------------------------------------------------------- */

$('#addCoreStudent').onclick=()=>{
  show($('#coreStudentForm'));
};


$('#cancelCoreStudent').onclick=()=>{
  hide($('#coreStudentForm'));
};


$('#saveCoreStudent').onclick=async()=>{

  const first=
    $('#coreStudentFirst').value.trim();

  const last=
    $('#coreStudentLast').value.trim();


  if(!first || !last){

    return toast(
      'Enter the student first and last name.'
    );
  }


  const studentName=
    `${first} ${last}`;


  if(
    students.some(
      s=>
        normalizedName(s.studentName)===
        normalizedName(studentName)
    )
  ){

    return toast(
      'That student already exists.'
    );
  }


  await addDoc(
    sub('students'),
    {
      studentFirst:first,
      studentLast:last,
      studentName,

      parentName:
        $('#coreParentName').value.trim(),

      parentEmail:
        $('#coreParentEmail').value.trim(),

      parentPhone:
        $('#coreParentPhone').value.trim(),

      source:'Manual',
      active:true,

      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );


  await log(
    'Student added',
    `${studentName} added to VendorFlow.`,
    'Manual'
  );


  [
    '#coreStudentFirst',
    '#coreStudentLast',
    '#coreParentName',
    '#coreParentEmail',
    '#coreParentPhone'
  ].forEach(id=>{
    $(id).value='';
  });


  hide($('#coreStudentForm'));

  await refreshAll();

  toast('Student saved.');
};


/* ----------------------------------------------------------
   Service setup
   ---------------------------------------------------------- */

$('#addService').onclick=()=>{

  refreshStudentServiceSelectors();

  show($('#serviceForm'));
};


$('#cancelService').onclick=()=>{

  hide($('#serviceForm'));
};


$('#serviceType').onchange=()=>{

  const type=$('#serviceType').value;

  if(
    type==='Tutoring' &&
    !$('#serviceName').value.trim()
  ){
    $('#serviceName').value='Tutoring';
  }

  if(
    type==='Tutoring' &&
    $('#serviceSchedule').value==='Full'
  ){
    $('#serviceSchedule').value='Per Session';
  }
};


$('#serviceClass').onchange=()=>{

  const classId=
    $('#serviceClass').value;

  const classRecord=
    classes.find(c=>c.id===classId);

  if(!classRecord) return;


  if(!$('#serviceName').value.trim()){
    $('#serviceName').value=
      classRecord.name||'';
  }


  if(
    !$('#serviceTotal').value &&
    Number(classRecord.tuition||0)>0
  ){
    $('#serviceTotal').value=
      Number(classRecord.tuition);
  }


};


$('#saveService').onclick=async()=>{

  const studentId=
    $('#serviceStudent').value;


  if(!studentId){
    return toast('Choose a student.');
  }


  const student=
    coreStudentById(studentId);


  if(!student){
    return toast('Student could not be found.');
  }


  const totalPrice=
    Number($('#serviceTotal').value||0);


  if(totalPrice<0){
    return toast(
      'Service price cannot be negative.'
    );
  }


  const classId=
    $('#serviceClass').value;


  const classRecord=
    classes.find(c=>c.id===classId);


  const serviceType=
    $('#serviceType').value;


  const name=
    $('#serviceName').value.trim() ||
    classRecord?.name ||
    serviceType;


  await addDoc(
    sub('services'),
    {

      studentId,

      studentName:
        student.studentName||'',

      serviceType,

      name,

      classId:
        classId||'',

      classTerm:
        classRecord?.term||'',

      location:
        classRecord?.location||'',

      startDate:
        $('#serviceStart').value,

      endDate:
        $('#serviceEnd').value,

      totalPrice,

      tutoringRate:
        Number(
          $('#serviceTutoringRate').value||0
        ),

      schedule:
        $('#serviceSchedule').value,

      dueDay:
        Number(
          $('#serviceDueDay').value||4
        ),

      lateFee:
        Number(
          $('#serviceLateFee').value||25
        ),

      status:'Active',

      source:'Manual',

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    }
  );


  await log(
    'Service created',
    `${student.studentName} — ${name}: ${money(totalPrice)}.`,
    'Manual'
  );


  [
    '#serviceName',
    '#serviceStart',
    '#serviceEnd',
    '#serviceTotal',
    '#serviceTutoringRate',
    '#serviceNotes'
  ].forEach(id=>{

    const el=$(id);

    if(el){
      el.value='';
    }
  });


  $('#serviceDueDay').value='4';
  $('#serviceLateFee').value='25';
  $('#serviceSchedule').value='Full';
  $('#serviceType').value='Class';
  $('#serviceClass').value='';


  hide($('#serviceForm'));

  await refreshAll();

  toast('Service saved.');
};


/* ----------------------------------------------------------
   Roster → core student/service synchronization
   ---------------------------------------------------------- */

async function syncRosterToCoreRecords(
  classRecord,
  rosterRows
){

  const studentSnapshot=
    await getDocs(sub('students'));

  const existingStudents=
    studentSnapshot.docs.map(
      d=>({
        id:d.id,
        ...d.data()
      })
    );


  const serviceSnapshot=
    await getDocs(sub('services'));

  const existingServices=
    serviceSnapshot.docs.map(
      d=>({
        id:d.id,
        ...d.data()
      })
    );


  const studentMap=
    new Map(
      existingStudents.map(
        s=>[
          normalizedName(s.studentName),
          s
        ]
      )
    );


  for(const row of rosterRows){

    const normalized=
      normalizedName(row.studentName);

    if(!normalized) continue;


    let coreStudent=
      studentMap.get(normalized);


    if(!coreStudent){

      const data={

        studentFirst:
          row.studentFirst||'',

        studentLast:
          row.studentLast||'',

        studentName:
          row.studentName||'',

        parentName:
          row.parentName||'',

        parentEmail:
          row.parentEmail||'',

        parentPhone:
          row.parentPhone||'',

        grade:
          row.grade||'',

        source:
          row.source||'Roster import',

        active:
          active(row),

        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      };


      const ref=
        await addDoc(
          sub('students'),
          data
        );


      coreStudent={
        id:ref.id,
        ...data
      };


      studentMap.set(
        normalized,
        coreStudent
      );

    }else{

      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'students',
          coreStudent.id
        ),
        {

          parentName:
            row.parentName ||
            coreStudent.parentName ||
            '',

          parentEmail:
            row.parentEmail ||
            coreStudent.parentEmail ||
            '',

          studentFirst:
            row.studentFirst ||
            coreStudent.studentFirst ||
            '',

          studentLast:
            row.studentLast ||
            coreStudent.studentLast ||
            '',

          studentName:
            row.studentName ||
            coreStudent.studentName ||
            '',

          parentPhone:
            row.parentPhone ||
            coreStudent.parentPhone ||
            '',

          grade:
            row.grade ||
            coreStudent.grade ||
            '',

          active:
            active(row),

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );
    }



    /*
     * Keep a stable link between the class roster row
     * and the main student account.
     */
    if(row.id){

      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'classes',
          classRecord.id,
          'students',
          row.id
        ),
        {
          coreStudentId:
            coreStudent.id,

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );
    }


    const existingService=
      existingServices.find(
        s=>
          s.studentId===coreStudent.id &&
          s.classId===classRecord.id
      );


    const status=
      active(row)
        ? 'Active'
        : 'Dropped';


    if(!existingService){

      const totalPrice=
        Number(
          classRecord.tuition||0
        );


      await addDoc(
        sub('services'),
        {

          studentId:
            coreStudent.id,

          studentName:
            row.studentName||'',

          serviceType:'Class',

          name:
            classRecord.name||'Class',

          classId:
            classRecord.id,

          classTerm:
            classRecord.term||'',

          location:
            classRecord.location||'',

          totalPrice,

          tutoringRate:0,

          schedule:'Custom',

          dueDay:4,

          lateFee:25,

          status,

          source:'CSV import',

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

    }else{

      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'services',
          existingService.id
        ),
        {

          studentName:
            row.studentName ||
            existingService.studentName ||
            '',

          status,

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );
    }
  }
}





/* ==========================================================
   DUPLICATE PROTECTION
   ========================================================== */

function normalizeDuplicateKey(value){

  return String(value||'')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}


function duplicateMoney(value){

  return Math.round(
    Number(value||0)*100
  );
}


function paymentPartyKey(payment){

  if(payment.studentId){
    return `STUDENT:${payment.studentId}`;
  }

  const student=
    normalizedName(
      payment.student||''
    );

  if(student){
    return `STUDENTNAME:${student}`;
  }

  const payer=
    normalizedName(
      payment.payer||
      payment.parentName||
      ''
    );

  return payer
    ? `PAYER:${payer}`
    : '';
}


function findDuplicatePayment(candidate){

  const method=
    String(candidate.method||'')
      .trim()
      .toLowerCase();

  /*
   * User-requested duplicate rules apply to
   * Venmo, Zelle and Cash.
   * Other methods can get their own rules later.
   */
  if(
    ![
      'venmo',
      'zelle',
      'cash'
    ].includes(method)
  ){
    return null;
  }

  const date=
    String(candidate.date||'')
      .trim();

  const amount=
    duplicateMoney(
      candidate.amount
    );

  const party=
    paymentPartyKey(
      candidate
    );


  return payments.find(existing=>{

    const existingMethod=
      String(existing.method||'')
        .trim()
        .toLowerCase();

    if(existingMethod!==method){
      return false;
    }

    if(
      String(existing.date||'').trim()
      !==date
    ){
      return false;
    }

    if(
      duplicateMoney(existing.amount)
      !==amount
    ){
      return false;
    }

    /*
     * If both records have a student/payer identity,
     * require the identity to match too.
     */
    const existingParty=
      paymentPartyKey(existing);

    if(
      party &&
      existingParty &&
      party!==existingParty
    ){
      return false;
    }

    return true;
  }) || null;
}


function findDuplicateCertificate(candidate){

  const number=
    normalizeDuplicateKey(
      candidate.number
    );

  if(!number){
    return null;
  }

  return certs.find(existing=>
    normalizeDuplicateKey(
      existing.number
    )===number
  ) || null;
}


function cleanReviewPayload(data){

  const cleaned={};

  for(
    const [key,value]
    of Object.entries(data||{})
  ){

    /*
     * createdAt / updatedAt are recreated if
     * the vendor chooses Keep Anyway.
     */
    if(
      key==='createdAt' ||
      key==='updatedAt'
    ){
      continue;
    }

    cleaned[key]=value;
  }

  return cleaned;
}


async function queueDuplicateReview(
  itemType,
  incoming,
  existing
){

  const isCertificate=
    itemType==='certificate';

  const detail=
    isCertificate
      ? `Certificate ${incoming.number||'(no number)'} already exists for ${existing.student||'a student'}.`
      : `${incoming.method} payment for ${money(incoming.amount)} on ${incoming.date} appears to already exist.`;


  await addDoc(
    sub('review'),
    {

      reviewType:
        'duplicate',

      itemType,

      title:
        isCertificate
          ? 'Possible duplicate certificate'
          : 'Possible duplicate payment',

      detail,

      defaultDecision:
        'reject',

      incoming:
        cleanReviewPayload(
          incoming
        ),

      existingId:
        existing.id||'',

      existingSummary:
        isCertificate
          ? `${existing.student||''} · ${existing.school||''} · ${existing.number||''} · ${money(existing.amount)}`
          : `${existing.student||existing.payer||''} · ${existing.method||''} · ${existing.date||''} · ${money(existing.amount)}`,

      source:
        incoming.source ||
        'VendorFlow',

      createdAt:
        serverTimestamp()
    }
  );


  await log(
    'Possible duplicate detected',
    `${detail} The new item was not recorded and was sent to Needs Review.`,
    'VendorFlow'
  );
}


async function rejectDuplicateReview(
  reviewId
){

  const review=
    reviews.find(
      r=>r.id===reviewId
    );

  if(!review){
    return;
  }


  await deleteDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'review',
      reviewId
    )
  );


  await log(
    'Duplicate rejected',
    review.detail ||
    'Suspected duplicate was rejected.',
    'Manual'
  );


  await refreshAll();

  toast(
    'Duplicate rejected.'
  );
}


async function keepDuplicateReview(
  reviewId
){

  const review=
    reviews.find(
      r=>r.id===reviewId
    );

  if(
    !review ||
    review.reviewType!=='duplicate'
  ){
    return;
  }


  const collectionName=
    review.itemType==='certificate'
      ? 'certificates'
      : 'payments';


  const incoming={
    ...(review.incoming||{}),

    duplicateOverride:true,

    duplicateReviewId:
      review.id,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };


  await addDoc(
    sub(collectionName),
    incoming
  );


  await deleteDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'review',
      reviewId
    )
  );


  await log(
    'Duplicate kept as separate item',
    review.detail ||
    'Suspected duplicate was kept.',
    'Manual'
  );


  await refreshAll();

  toast(
    'Item kept and recorded.'
  );
}



function toggle(id){
  $(id).classList.toggle('hidden');
}


/* ==========================================================
   SMART PAYMENT → STUDENT MATCHING
   ========================================================== */

function paymentStudentMatches(searchText){

  const q=
    normalizedName(searchText);

  if(!q){
    return [];
  }

  return students
    .map(student=>{

      const studentName=
        normalizedName(student.studentName||'');

      const parentName=
        normalizedName(student.parentName||'');

      const parentEmail=
        String(student.parentEmail||'')
          .trim()
          .toLowerCase();

      let score=0;

      if(studentName===q) score=100;
      else if(parentName===q) score=95;
      else if(studentName.startsWith(q)) score=85;
      else if(parentName.startsWith(q)) score=80;
      else if(studentName.includes(q)) score=70;
      else if(parentName.includes(q)) score=65;
      else if(parentEmail.includes(q)) score=55;

      return {
        student,
        score
      };
    })
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,8);
}


function clearPaymentStudentSelection(){

  selectedPaymentStudentId=null;

  const matches=$('#payStudentMatches');

  if(matches){
    matches.innerHTML='';
    hide(matches);
  }
}


function selectPaymentStudent(studentId){

  const student=
    students.find(s=>s.id===studentId);

  if(!student){
    return;
  }

  selectedPaymentStudentId=
    student.id;

  $('#payStudent').value=
    student.studentName||'';

  if(
    $('#payPayer') &&
    !$('#payPayer').value.trim() &&
    student.parentName
  ){
    $('#payPayer').value=
      student.parentName;
  }

  const matches=
    $('#payStudentMatches');

  if(matches){
    matches.innerHTML='';
    hide(matches);
  }
}


function renderPaymentStudentMatches(){

  const input=$('#payStudent');
  const matchesBox=$('#payStudentMatches');

  if(!input || !matchesBox){
    return;
  }

  const typed=
    input.value.trim();

  if(!typed){
    clearPaymentStudentSelection();
    return;
  }

  const matches=
    paymentStudentMatches(typed);

  if(!matches.length){
    matchesBox.innerHTML=`
      <div class="vf-match-empty">
        No matching student or parent yet.
      </div>
    `;
    show(matchesBox);
    return;
  }

  matchesBox.innerHTML=
    matches
      .map(({student})=>`

        <button
          type="button"
          class="vf-student-match"
          data-payment-student="${student.id}">

          <strong>
            ${esc(student.studentName||'Unnamed student')}
          </strong>

          <span>
            ${student.parentName
              ? 'Parent: '+esc(student.parentName)
              : 'No parent name saved'}
          </span>

          ${student.parentEmail
            ? `<small>${esc(student.parentEmail)}</small>`
            : ''}

        </button>

      `)
      .join('');


  show(matchesBox);


  $$('[data-payment-student]')
    .forEach(btn=>{

      btn.onclick=()=>{

        selectPaymentStudent(
          btn.dataset.paymentStudent
        );
      };
    });
}


function uniqueStudentMatchForPayment(payment){

  if(payment.studentId){
    return null;
  }

  const typedStudent=
    normalizedName(payment.student||'');

  const typedPayer=
    normalizedName(payment.payer||'');


  let candidates=
    students.filter(student=>{

      const fullName=
        normalizedName(student.studentName||'');

      const firstName=
        normalizedName(student.studentFirst||'');

      const parentName=
        normalizedName(student.parentName||'');

      if(
        typedStudent &&
        fullName===typedStudent
      ){
        return true;
      }

      if(
        typedStudent &&
        firstName===typedStudent
      ){
        return true;
      }

      if(
        typedPayer &&
        parentName===typedPayer
      ){
        return true;
      }

      return false;
    });


  const uniqueIds=
    [...new Set(candidates.map(s=>s.id))];

  if(uniqueIds.length!==1){
    return null;
  }

  return students.find(
    s=>s.id===uniqueIds[0]
  )||null;
}


async function repairUnmatchedPayments(){

  const repairs=[];

  for(const payment of payments){

    if(payment.studentId){
      continue;
    }

    const student=
      uniqueStudentMatchForPayment(payment);

    if(!student){
      continue;
    }

    repairs.push({
      payment,
      student
    });
  }


  if(!repairs.length){
    return 0;
  }


  for(const {payment,student} of repairs){

    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'payments',
        payment.id
      ),
      {
        studentId:student.id,

        student:
          student.studentName||payment.student||'',

        parentName:
          student.parentName||'',

        parentEmail:
          student.parentEmail||'',

        matchedBy:'VendorFlow safe match',

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    await log(
      'Payment matched to student',
      `${money(payment.amount)} payment matched to `+
      `${student.studentName}.`,
      'VendorFlow'
    );
  }


  return repairs.length;
}





if($('#payStudent')){

  $('#payStudent')
    .addEventListener(
      'input',
      ()=>{

        selectedPaymentStudentId=null;

        renderPaymentStudentMatches();
      }
    );


  $('#payStudent')
    .addEventListener(
      'focus',
      ()=>{

        if($('#payStudent').value.trim()){
          renderPaymentStudentMatches();
        }
      }
    );
}



$('#addRefund').onclick=()=>{

  hide(
    $('#paymentForm')
  );

  resetRefundForm();

  $('#refundDate').value=
    new Date()
      .toISOString()
      .slice(0,10);

  show(
    $('#refundForm')
  );
};


$('#cancelRefund').onclick=()=>{

  resetRefundForm();

  hide(
    $('#refundForm')
  );
};


$('#refundStudent').onchange=()=>{

  updateRefundAvailable();
};


$('#saveRefund').onclick=async()=>{

  const student=
    students.find(
      item=>
        item.id===
        $('#refundStudent').value
    );


  if(!student){

    return toast(
      'Choose the student receiving the refund.'
    );
  }


  const amount=
    Number(
      $('#refundAmount').value
    )||0;


  if(amount<=0){

    return toast(
      'Enter the refund amount.'
    );
  }


  const available=
    refundableParentAmount(
      student
    );


  const override=
    $('#refundOverride').checked;


  if(
    amount>available+.009 &&
    !override
  ){

    return toast(
      `Refund exceeds the ${money(available)} currently refundable.`
    );
  }


  if(
    amount>available+.009 &&
    override
  ){

    const ok=
      confirm(
        `Refund ${money(amount)} even though VendorFlow shows ` +
        `${money(available)} in refundable parent payments?\n\n` +
        `This override will be recorded in History.`
      );

    if(!ok){
      return;
    }
  }


  const method=
    $('#refundMethod').value;


  /*
   * Refunds are stored in Payments as NEGATIVE amounts.
   * This preserves the original payment while automatically
   * reducing parent-payment credit in account calculations.
   */
  const refund={

    date:
      $('#refundDate').value ||
      new Date()
        .toISOString()
        .slice(0,10),

    payer:
      student.parentName||'',

    studentId:
      student.id,

    student:
      student.studentName||'',

    class:
      '',

    amount:
      -Math.abs(amount),

    method,

    transactionType:
      'Refund',

    refundReason:
      $('#refundReason').value,

    refundNote:
      $('#refundNote').value.trim(),

    refundOverride:
      override,

    source:
      'Manual refund',

    matchedBy:
      'Student account',

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };


  await addDoc(
    sub('payments'),
    refund
  );


  await log(
    'Refund recorded',
    `${money(amount)} refunded to ` +
    `${student.studentName} via ${method}. ` +
    `Reason: ${refund.refundReason}` +
    `${override?' — manual limit override used.':''}`,
    'Manual'
  );


  resetRefundForm();

  hide(
    $('#refundForm')
  );


  await refreshAll();


  toast(
    `Refund of ${money(amount)} recorded.`
  );
};


$('#addPayment').onclick=()=>{

  hide(
    $('#refundForm')
  );

  toggle(
    '#paymentForm'
  );
};

$('#savePayment').onclick=async()=>{

  let amount=
    Number($('#payAmount').value);

  if(!amount){
    return toast('Enter an amount.');
  }


  let selectedStudent=null;


  if(selectedPaymentStudentId){

    selectedStudent=
      students.find(
        s=>s.id===selectedPaymentStudentId
      );
  }


  if(!selectedStudent){

    const typed=
      $('#payStudent').value.trim();

    const possible=
      paymentStudentMatches(typed);

    if(
      possible.length===1
    ){
      selectedStudent=
        possible[0].student;

      selectedPaymentStudentId=
        selectedStudent.id;
    }
  }


  if(!selectedStudent){

    return toast(
      'Choose the student from the matching list.'
    );
  }


  let d={

    date:
      $('#payDate').value ||
      new Date().toISOString().slice(0,10),

    payer:
      $('#payPayer').value.trim() ||
      selectedStudent.parentName ||
      '',

    studentId:
      selectedStudent.id,

    student:
      selectedStudent.studentName||'',

    parentName:
      selectedStudent.parentName||'',

    parentEmail:
      selectedStudent.parentEmail||'',

    className:
      $('#payClass').value.trim(),

    amount,

    method:
      $('#payMethod').value,

    source:'Manual',

    matchedBy:'Vendor selection',

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };

  const duplicatePayment=
    findDuplicatePayment(d);


  if(duplicatePayment){

    await queueDuplicateReview(
      'payment',
      d,
      duplicatePayment
    );

    hide($('#paymentForm'));

    selectedPaymentStudentId=null;

    clearPaymentStudentSelection();

    await refreshAll();

    switchView('review');

    toast(
      'Possible duplicate — not recorded.'
    );

    return;
  }



  await addDoc(
    sub('payments'),
    d
  );


  await log(
    'Payment recorded',
    `${selectedStudent.studentName} — `+
    `${money(amount)} via ${d.method}.`,
    'Manual'
  );


  [
    '#payDate',
    '#payPayer',
    '#payStudent',
    '#payClass',
    '#payAmount'
  ].forEach(id=>{

    const el=$(id);

    if(el){
      el.value='';
    }
  });


  selectedPaymentStudentId=null;

  clearPaymentStudentSelection();

  hide($('#paymentForm'));

  await refreshAll();

  toast('Payment recorded and credited.');
};




/* ==========================================================
   SECURE CERTIFICATE PDF STORAGE
   ========================================================== */

async function uploadCertificatePdf(file){

  if(!user){
    throw new Error('You must be logged in.');
  }

  if(!file){
    return null;
  }

  if(
    file.type!=='application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ){
    throw new Error(
      'Certificate file must be a PDF.'
    );
  }

  const MAX_BYTES =
    15 * 1024 * 1024;

  if(file.size > MAX_BYTES){
    throw new Error(
      'Certificate PDF must be smaller than 15 MB.'
    );
  }

  const token =
    await user.getIdToken();

  const form =
    new FormData();

  form.append(
    'file',
    file,
    file.name
  );

  const response =
    await fetch(
      `${VENDORFLOW_API}/certificate/upload`,
      {
        method:'POST',
        headers:{
          Authorization:`Bearer ${token}`
        },
        body:form
      }
    );

  let data={};

  try{
    data=await response.json();
  }catch{}

  if(!response.ok){
    throw new Error(
      data.error ||
      data.detail ||
      'Certificate upload failed.'
    );
  }

  return data;
}



async function extractCertificatePdf(objectKey){

  if(!user || !objectKey){
    throw new Error(
      'Certificate PDF is not available.'
    );
  }

  const token=
    await user.getIdToken();

  const response=
    await fetch(
      `${VENDORFLOW_API}/certificate/extract`,
      {
        method:'POST',

        headers:{
          Authorization:`Bearer ${token}`,
          'Content-Type':'application/json'
        },

        body:JSON.stringify({
          objectKey
        })
      }
    );

  let data={};

  try{
    data=await response.json();
  }catch{}

  if(!response.ok){
    throw new Error(
      data.detail ||
      data.error ||
      'VendorFlow could not read this certificate.'
    );
  }

  return data;
}


function setCertificateField(selector,value){

  const el=$(selector);

  if(!el){
    return;
  }

  if(
    value===undefined ||
    value===null ||
    value===''
  ){
    return;
  }

  el.value=String(value);
}



function validateExtractedCertificate(result){

  const x = result?.extraction || {};
  const problems = [];
  const warnings = [];

  const student = students.find(
    s =>
      normalizedName(s.studentName) ===
      normalizedName(x.studentName)
  ) || null;

  if(!x.studentName){
    problems.push('Student name was not found.');
  }

  if(!x.charterSchool){
    problems.push('Charter school was not found.');
  }

  if(!(Number(x.amount) > 0)){
    problems.push('A valid certificate amount was not found.');
  }

  if(
    !x.certificateNumber &&
    !x.purchaseOrderNumber
  ){
    problems.push('Certificate / PO number was not found.');
  }

  if(x.studentName && !student){
    warnings.push(
      `Could not confidently match ${x.studentName} to an existing student.`
    );
  }

  if(
    student &&
    Number(x.amount) > 0
  ){

    const account = studentAccountTotals(student);
    const amount = Number(x.amount);
    const totalDue = Number(account.totalDue || 0);

    if(
      totalDue > 0 &&
      amount > Math.max(totalDue * 2, totalDue + 500)
    ){
      problems.push(
        `Certificate amount ${money(amount)} is far above this student's known service charges of ${money(totalDue)}.`
      );
    }

    if(totalDue > 0){

      const ratio = amount / totalDue;

      if(
        Math.abs(ratio - 10) < 0.01 ||
        Math.abs(ratio - 100) < 0.01
      ){
        problems.push(
          `Possible extra-zero error: ${money(amount)} was extracted, but this student's services total ${money(totalDue)}.`
        );
      }
    }
  }

  const start = Date.parse(x.serviceStartDate || '');
  const end = Date.parse(x.serviceEndDate || '');

  if(
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start > end
  ){
    problems.push(
      'Service end date is earlier than the service start date.'
    );
  }

  return {
    student,
    problems: [...new Set(problems)],
    warnings: [...new Set(warnings)],
    safe: problems.length === 0
  };
}


function fillCertificateFromExtraction(result){

  const x=
    result?.extraction || {};

  const validation=
    validateExtractedCertificate(result);

  if(!validation.safe){
    x.needsReview=true;
    x.confidence=
      Math.min(
        Number(x.confidence||0),
        0.49
      );
  }

  setCertificateField(
    '#certStudent',
    x.studentName
  );

  setCertificateField(
    '#certSchool',
    x.charterSchool
  );

  if(Number(x.amount)>0){
    setCertificateField(
      '#certAmount',
      Number(x.amount)
    );
  }

  const reference=
    x.certificateNumber ||
    x.purchaseOrderNumber ||
    '';

  setCertificateField(
    '#certNumber',
    reference
  );

  setCertificateField(
    '#certIssueDate',
    x.issueDate
  );

  setCertificateField(
    '#certServiceStart',
    x.serviceStartDate
  );

  setCertificateField(
    '#certServiceEnd',
    x.serviceEndDate
  );

  setCertificateField(
    '#certBillingEmail',
    x.billingEmail
  );

  setCertificateField(
    '#certServiceDescription',
    x.serviceDescription
  );

  setCertificateField(
    '#certInvoiceInstructions',
    x.invoiceInstructions
  );

  setCertificateField(
    '#certNotes',
    x.notes
  );


  const review=
    $('#certExtractionReview');

  if(!review){
    return;
  }

  const confidence=
    Math.max(
      0,
      Math.min(
        1,
        Number(x.confidence||0)
      )
    );

  const percent=
    Math.round(confidence*100);


  if(x.needsReview){

    review.className=
      'vf-extraction-review vf-extraction-warning';

    const problemHtml=
      validation.problems.length
        ? `<ul>${validation.problems.map(
            p=>`<li>${esc(p)}</li>`
          ).join('')}</ul>`
        : '';

    const warningHtml=
      validation.warnings.length
        ? `<ul>${validation.warnings.map(
            w=>`<li>${esc(w)}</li>`
          ).join('')}</ul>`
        : '';

    review.innerHTML=
      `<strong>VendorFlow stopped this certificate for review.</strong>
       Nothing suspicious will be credited automatically.
       ${problemHtml}
       ${warningHtml}`;

  }else{

    review.className=
      'vf-extraction-review vf-extraction-good';

    review.innerHTML=
      `<strong>Certificate read successfully.</strong>
       VendorFlow filled in the information it found.
       Give the fields a quick check, then save.`;
  }

  show(review);
}


async function openCertificatePdf(objectKey){

  if(!user || !objectKey){
    return;
  }

  try{

    const token =
      await user.getIdToken();

    const response =
      await fetch(
        `${VENDORFLOW_API}/certificate/file/` +
        encodeURIComponent(objectKey),
        {
          headers:{
            Authorization:`Bearer ${token}`
          }
        }
      );

    if(!response.ok){

      let data={};

      try{
        data=await response.json();
      }catch{}

      throw new Error(
        data.error ||
        'Could not open certificate PDF.'
      );
    }

    const blob =
      await response.blob();

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href=url;
    link.target='_blank';
    link.rel='noopener';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(
      ()=>URL.revokeObjectURL(url),
      60000
    );

  }catch(error){

    console.error(error);

    toast(
      error.message ||
      'Could not open certificate PDF.'
    );
  }
}


function wireCertificatePdfButtons(){

  $$('[data-cert-pdf]').forEach(button=>{

    button.onclick=()=>{

      openCertificatePdf(
        button.dataset.certPdf
      );
    };
  });
}





/* CERTIFICATE PDF FILE PICKER */

if($('#certPdf')){

  $('#certPdf').addEventListener(
    'change',
    async()=>{

      const file=
        $('#certPdf').files?.[0];

      const status=
        $('#certPdfStatus');

      const review=
        $('#certExtractionReview');


      pendingCertificatePdf=null;


      if(review){
        hide(review);
        review.innerHTML='';
      }


      if(!file){

        status.textContent=
          'No PDF selected.';

        return;
      }


      if(
        file.type!=='application/pdf' &&
        !file.name.toLowerCase().endsWith('.pdf')
      ){

        $('#certPdf').value='';

        status.textContent=
          'Please choose a PDF file.';

        return;
      }


      const mb=
        (file.size/1024/1024)
          .toFixed(2);


      try{

        status.textContent=
          `${file.name} — ${mb} MB — uploading securely…`;


        const uploaded=
          await uploadCertificatePdf(
            file
          );


        /*
         * Store this immediately so even if AI extraction fails,
         * Save Certificate can still keep the successfully uploaded PDF.
         */
        pendingCertificatePdf={
          ...uploaded
        };


        status.textContent=
          'PDF stored securely. Reading certificate…';


        const extraction=
          await extractCertificatePdf(
            uploaded.objectKey
          );


        pendingCertificatePdf={
          ...uploaded,
          extraction:
            extraction.extraction || {},
          clientValidation:
            validateExtractedCertificate(extraction),
          sourceTextLength:
            extraction.sourceTextLength || 0
        };


        fillCertificateFromExtraction(
          extraction
        );


        status.textContent=
          `${file.name} — ready to review.`;


      }catch(error){

        console.error(error);


        status.textContent=
          pendingCertificatePdf?.objectKey
            ? 'PDF stored, but automatic reading needs review.'
            : 'PDF upload failed.';


        if(review){

          review.className=
            'vf-extraction-review vf-extraction-warning';

          review.innerHTML=
            pendingCertificatePdf?.objectKey
              ? `<strong>The PDF is safely stored.</strong>
                 VendorFlow could not confidently read it.
                 Enter or correct the fields manually, then save.`
              : `<strong>The PDF could not be uploaded.</strong>
                 Please try again.`;

          show(review);
        }


        toast(
          error.message ||
          'Certificate could not be read.'
        );
      }
    }
  );
}



$('#addCertificate').onclick=()=>{

  toggle('#certificateForm');

};



$('#cancelCertificate').onclick=()=>{

  hide($('#certificateForm'));

  if($('#certPdf')){
    $('#certPdf').value='';
  }

  if($('#certPdfStatus')){
    $('#certPdfStatus').textContent=
      'No PDF selected.';
  }

  pendingCertificatePdf=null;

  if($('#certExtractionReview')){
    hide($('#certExtractionReview'));
    $('#certExtractionReview').innerHTML='';
  }
};



$('#saveCertificate').onclick=async()=>{

  const button =
    $('#saveCertificate');

  const studentTyped =
    $('#certStudent').value.trim();

  const school =
    $('#certSchool').value.trim();

  const amount =
    Number($('#certAmount').value) || 0;

  const number =
    $('#certNumber').value.trim();

  let status =
    $('#certStatus').value;

  if(
    pendingCertificatePdf?.clientValidation &&
    !pendingCertificatePdf.clientValidation.safe
  ){
    status='Needs Review';
    $('#certStatus').value='Needs Review';
  }

  const pdfFile =
    $('#certPdf')?.files?.[0] || null;


  if(!studentTyped){
    return toast(
      'Enter the student name.'
    );
  }

  if(!amount){
    return toast(
      'Enter the certificate amount.'
    );
  }


  const studentMatch =
    students.find(
      s=>
        normalizedName(s.studentName) ===
        normalizedName(studentTyped)
    );


  button.disabled=true;

  button.textContent =
    pdfFile
      ? 'Uploading PDF…'
      : 'Saving…';


  try{

    let pdf=
      pendingCertificatePdf;


    if(
      pdfFile &&
      !pdf?.objectKey
    ){

      $('#certPdfStatus').textContent=
        'Uploading securely…';

      pdf=
        await uploadCertificatePdf(
          pdfFile
        );

      $('#certPdfStatus').textContent=
        'PDF uploaded securely.';
    }


    const data={

      studentId:
        studentMatch?.id || '',

      student:
        studentMatch?.studentName ||
        studentTyped,

      parentName:
        studentMatch?.parentName || '',

      parentEmail:
        studentMatch?.parentEmail || '',

      school,

      amount,

      number,

      status,

      source:'Manual',

      matchedBy:
        studentMatch
          ? 'Student name match'
          : 'Manual text',

      pdfObjectKey:
        pdf?.objectKey || '',

      pdfName:
        pdf?.originalName || '',

      pdfSize:
        pdf?.size || 0,

      pdfStored:
        Boolean(pdf?.objectKey),

      issueDate:
        $('#certIssueDate')?.value.trim() || '',

      serviceStartDate:
        $('#certServiceStart')?.value.trim() || '',

      serviceEndDate:
        $('#certServiceEnd')?.value.trim() || '',

      serviceDescription:
        $('#certServiceDescription')?.value.trim() || '',

      billingEmail:
        $('#certBillingEmail')?.value.trim() || '',

      invoiceInstructions:
        $('#certInvoiceInstructions')?.value.trim() || '',

      notes:
        $('#certNotes')?.value.trim() || '',

      extraction:
        pdf?.extraction || null,

      extractionConfidence:
        Number(
          pdf?.extraction?.confidence || 0
        ),

      extractionNeedsReview:
        Boolean(
          pdf?.extraction?.needsReview
        ),

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };

    const duplicateCertificate=
      findDuplicateCertificate(
        data
      );


    if(duplicateCertificate){

      await queueDuplicateReview(
        'certificate',
        data,
        duplicateCertificate
      );

      /*
       * The PDF may already be stored in R2.
       * Keep its reference inside the review item so the
       * vendor can still choose "Keep anyway".
       */
      pendingCertificatePdf=null;

      if($('#certPdf')){
        $('#certPdf').value='';
      }

      if($('#certPdfStatus')){
        $('#certPdfStatus').textContent=
          'Possible duplicate — sent to review.';
      }

      hide($('#certificateForm'));

      await refreshAll();

      switchView('review');

      toast(
        'Duplicate certificate blocked.'
      );

      return;
    }



    await addDoc(
      sub('certificates'),
      data
    );


    await log(
      'Certificate added',
      `${school||'Charter'} certificate for ` +
      `${data.student} — ${money(amount)}` +
      `${pdf?' — PDF stored securely.':''}`,
      'Manual'
    );


    [
      '#certStudent',
      '#certSchool',
      '#certAmount',
      '#certNumber',
      '#certIssueDate',
      '#certServiceStart',
      '#certServiceEnd',
      '#certBillingEmail',
      '#certServiceDescription',
      '#certInvoiceInstructions',
      '#certNotes'
    ].forEach(id=>{

      const el=$(id);

      if(el){
        el.value='';
      }
    });


    if($('#certPdf')){
      $('#certPdf').value='';
    }


    if($('#certPdfStatus')){
      $('#certPdfStatus').textContent=
        'No PDF selected.';
    }

    pendingCertificatePdf=null;

    if($('#certExtractionReview')){
      hide($('#certExtractionReview'));
      $('#certExtractionReview').innerHTML='';
    }


    hide($('#certificateForm'));

    await refreshAll();


    toast(
      pdf
        ? 'Certificate and PDF saved.'
        : 'Certificate saved.'
    );


  }catch(error){

    console.error(error);

    if($('#certPdfStatus')){
      $('#certPdfStatus').textContent=
        'Upload failed. Certificate was not saved.';
    }

    toast(
      error.message ||
      'Certificate could not be saved.'
    );


  }finally{

    button.disabled=false;

    button.textContent=
      'Save certificate';
  }
};


$('#addCompliance').onclick=()=>toggle('#complianceForm');

$('#saveCompliance').onclick=async()=>{
  let d={
    school:$('#compSchool').value.trim(),
    task:$('#compTask').value.trim(),
    due:$('#compDue').value,
    status:$('#compStatus').value,
    source:'Manual',
    createdAt:serverTimestamp()
  };

  if(!d.task)
    return toast('Enter the requirement.');

  await addDoc(sub('compliance'),d);

  await log(
    'Compliance task added',
    `${d.task}${d.school?' — '+d.school:''}.`,
    'Manual'
  );

  hide($('#complianceForm'));

  await refreshAll();
};

function renderRecords(){
  $('#paymentList').innerHTML=
    payments.length
    ? payments.map(d=>
        `<div class="record">
          <strong>$${Number(d.amount).toFixed(2)} — ${esc(d.payer||d.student)}</strong>
          <div class="meta">${esc(d.date)} · ${d.transactionType==='Refund'
          ? '<strong class="vf-refund-label">REFUND</strong> · '
          : ''}${esc(d.method)} · ${esc(d.student)}${d.parentName?' · Parent: '+esc(d.parentName):''}${d.className?' · '+esc(d.className):''}</div>
        </div>`
      ).join('')
    : '<div class="empty">No payments yet.</div>';

  $('#certificateList').innerHTML=
    certs.length
    ? certs.map(d=>
        `<div class="record">
          <strong>${esc(d.student)} — $${Number(d.amount).toFixed(2)}</strong>
          <div class="meta">${esc(d.school)} · ${esc(d.number)} · ${esc(d.status)}</div>

          ${d.pdfObjectKey
            ? `<div class="vf-cert-actions">
                 <button
                   type="button"
                   class="vf-small-button"
                   data-cert-pdf="${esc(d.pdfObjectKey)}">
                   View PDF
                 </button>
               </div>`
            : ''}

        </div>`
      ).join('')
    : '<div class="empty">No certificates yet.</div>';

  wireCertificatePdfButtons();

  $('#complianceList').innerHTML=
    compliance.length
    ? compliance.map(d=>
        `<div class="record">
          <strong>${esc(d.task)}</strong>
          <div class="meta">${esc(d.school)} · ${esc(d.status)} · ${esc(d.due)}</div>
        </div>`
      ).join('')
    : '<div class="empty">No compliance tasks yet.</div>';
}

function renderReviews(){

  const list=
    $('#reviewList');


  if(!reviews.length){

    list.innerHTML=
      '<div class="empty">Nothing needs review.</div>';

    return;
  }


  list.innerHTML=
    reviews.map(review=>{

      if(
        review.reviewType!=='duplicate'
      ){

        return `
          <div class="record">
            <strong>
              ${esc(review.title||'Needs review')}
            </strong>

            <div class="meta">
              ${esc(review.detail||'')}
            </div>
          </div>
        `;
      }


      const incoming=
        review.incoming||{};


      const incomingSummary=
        review.itemType==='certificate'
          ? `${incoming.student||''} · ${incoming.school||''} · ${incoming.number||''} · ${money(incoming.amount)}`
          : `${incoming.student||incoming.payer||''} · ${incoming.method||''} · ${incoming.date||''} · ${money(incoming.amount)}`;


      return `
        <div class="record vf-duplicate-review">

          <div class="vf-duplicate-label">
            POSSIBLE DUPLICATE
          </div>

          <strong>
            ${esc(review.title)}
          </strong>

          <div class="meta">
            ${esc(review.detail||'')}
          </div>


          <div class="vf-duplicate-compare">

            <div>
              <small>Already recorded</small>
              <strong>
                ${esc(review.existingSummary||'Existing record')}
              </strong>
            </div>

            <div>
              <small>New item</small>
              <strong>
                ${esc(incomingSummary)}
              </strong>
            </div>

          </div>


          <div class="vf-review-actions">

            <button
              type="button"
              class="primary"
              data-reject-duplicate="${review.id}">
              Reject duplicate
            </button>

            <button
              type="button"
              class="vf-secondary-button"
              data-keep-duplicate="${review.id}">
              Keep anyway
            </button>

          </div>

          <div class="vf-default-note">
            Default: reject duplicate
          </div>

        </div>
      `;
    }).join('');


  $$('[data-reject-duplicate]')
    .forEach(button=>{

      button.onclick=()=>{

        rejectDuplicateReview(
          button.dataset.rejectDuplicate
        );
      };
    });


  $$('[data-keep-duplicate]')
    .forEach(button=>{

      button.onclick=()=>{

        keepDuplicateReview(
          button.dataset.keepDuplicate
        );
      };
    });
}

function date(ts){
  return ts?.toDate
    ? ts.toDate().toLocaleString()
    : 'Just now';
}

function renderHistoryInto(el,list){
  el.innerHTML=
    list.length
    ? list.map(d=>
        `<div class="history">
          <span>${esc(date(d.createdAt))}</span>
          <div>
            <small>${esc(d.source)}</small>
            <strong>${esc(d.action)}</strong>
            <div class="meta">${esc(d.detail)}</div>
          </div>
        </div>`
      ).join('')
    : '<div class="empty">No history yet.</div>';
}

function renderHistory(){
  renderHistoryInto(
    $('#historyList'),
    history
  );

  renderHistoryInto(
    $('#recentHistory'),
    history.slice(0,6)
  );
}

function fillProfile(){
  $('#pBusiness').value=profile.businessName||'';
  $('#pOwner').value=profile.ownerName||'';
  $('#pAddress').value=profile.address||'';
  $('#pPhone').value=profile.phone||'';
  $('#pLocations').value=profile.locations||'';
  $('#pSchools').value=profile.schools||'';
}

$('#saveProfile').onclick=async()=>{
  let d={
    businessName:$('#pBusiness').value.trim(),
    ownerName:$('#pOwner').value.trim(),
    address:$('#pAddress').value.trim(),
    city:$('#pCity').value.trim(),
    state:$('#pState').value.trim(),
    zip:$('#pZip').value.trim(),
    phone:$('#pPhone').value.trim(),
    locations:$('#pLocations').value.trim(),
    schools:$('#pSchools').value.trim(),
    updatedAt:serverTimestamp()
  };

  await setDoc(
    vendorDoc(),
    d,
    {merge:true}
  );

  profile={
    ...profile,
    ...d
  };

  $('#bizNameSide').textContent=
    d.businessName||'VendorFlow';

  await log(
    'Business profile updated',
    'Business information was manually updated.',
    'Manual'
  );

  await refreshAll();

  toast('Business profile saved.');
};

function switchView(v){
  $$('.view').forEach(
    x=>x.classList.remove('active')
  );

  $(`#${v}View`).classList.add('active');

  let names={
    dashboard:'Dashboard',
    classes:'Class Rosters',
    students:'Students & Services',
    payments:'Payments',
    certificates:'Certificates',
    compliance:'Compliance',
    review:'Needs Review',
    history:'History',
    profile:'Business Profile'
  };

  $('#title').textContent=names[v];

  $$('nav button').forEach(
    b=>b.classList.toggle(
      'active',
      b.dataset.view===v
    )
  );
}

$$('nav button').forEach(
  b=>b.onclick=()=>switchView(b.dataset.view)
);

$$('[data-go]').forEach(
  b=>b.onclick=()=>switchView(b.dataset.go)
);

installVendorFlowBranding();setAuthMode('login');
