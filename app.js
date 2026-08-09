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

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],show=e=>e.classList.remove("hidden"),hide=e=>e.classList.add("hidden"),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
let user=null,profile={},classes=[],roster=[],students=[],services=[],payments=[],certs=[],compliance=[],reviews=[],history=[],authMode="login",step=0,answers={},preview=[],map={},headers=[];
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
  students=await getList('students',false);
  services=await getList('services',false);
  payments=await getList('payments');
  certs=await getList('certificates');
  compliance=await getList('compliance');
  reviews=await getList('review');
  history=await getList('history');
  renderAll();
}

function renderAll(){
  renderClassSelect();
  renderDashboard();
  renderRoster();
  renderStudentsServices();
  renderRecords();
  renderReviews();
  renderHistory();
}

function renderDashboard(){
  $('#statClasses').textContent=classes.length;
  $('#statStudents').textContent=classes.reduce((a,c)=>a+(c.activeStudentCount||0),0);
  $('#statReview').textContent=reviews.length;
  $('#statHistory').textContent=history.length;
  $('#reviewBadge').textContent=reviews.length;
  renderHistoryInto($('#recentHistory'),history.slice(0,6));
}

function renderClassSelect(){
  let sel=$('#classSelect'),v=sel.value;

  sel.innerHTML='<option value="">Choose a class</option>'+
    classes
      .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
      .map(c=>`<option value="${c.id}">${esc(c.name)}${c.term?' — '+esc(c.term):''}</option>`)
      .join('');

  if(classes.some(c=>c.id===v))sel.value=v;
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

  toast('Class saved.');
};

$('#classSelect').onchange=async()=>{
  preview=[];
  hide($('#previewCard'));
  await loadRoster();
  renderRoster();
};

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
    'inactive'
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

function renderRoster(){
  let c=currentClass();

  if(!c){
    show($('#rosterEmpty'));
    hide($('#rosterWrap'));
    hide($('#addStudent'));
    hide($('#deleteClass'));
    return;
  }

  show($('#addStudent'));
  show($('#deleteClass'));

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
        <td>${esc(s.status)}</td>
        <td>${esc(s.grade)}</td>
        <td>
          <button data-status="${s.id}">Change status</button>
        </td>
      </tr>`
    ).join('');

  $$('[data-status]').forEach(
    b=>b.onclick=()=>changeStatus(b.dataset.status)
  );
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

$('#addStudent').onclick=()=>
  $('#studentForm').classList.toggle('hidden');

$('#saveStudent').onclick=async()=>{
  let c=currentClass(),
      sf=$('#sf').value.trim(),
      sl=$('#sl').value.trim();

  if(!c||!sf||!sl)
    return toast('Enter student first and last name.');

  let s={
    studentFirst:sf,
    studentLast:sl,
    studentName:`${sf} ${sl}`,
    parentName:$('#pn').value.trim(),
    parentEmail:$('#pe').value.trim(),
    status:$('#ss').value,
    source:'Manual',
    createdAt:serverTimestamp()
  };

  await addDoc(
    collection(db,'vendors',user.uid,'classes',c.id,'students'),
    s
  );

  await loadRoster();

  await updateDoc(
    doc(db,'vendors',user.uid,'classes',c.id),
    {
      activeStudentCount:roster.filter(active).length,
      rosterCount:roster.length
    }
  );

  await log(
    'Student added',
    `${s.studentName} added to ${c.name}.`,
    'Manual'
  );

  await refreshAll();

  $('#classSelect').value=c.id;

  await loadRoster();
  renderRoster();

  hide($('#studentForm'));
  toast('Student added.');
};

$('#deleteClass').onclick=async()=>{
  let c=currentClass();

  if(!c||!confirm(`Delete ${c.name}?`))return;

  let s=await getDocs(
    collection(db,'vendors',user.uid,'classes',c.id,'students')
  );

  let b=writeBatch(db);

  s.forEach(d=>b.delete(d.ref));

  b.delete(
    doc(db,'vendors',user.uid,'classes',c.id)
  );

  await b.commit();

  await log(
    'Class deleted',
    c.name,
    'Manual'
  );

  $('#classSelect').value='';
  roster=[];

  await refreshAll();
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


function fundingLabel(service){

  if(service.status==='Dropped'){
    return 'Dropped';
  }

  if(service.fundingStatus==='Needs funding setup'){
    return 'Funding setup needed';
  }

  const charter=
    Number(service.charterExpected||0);

  const parent=
    Number(service.parentExpected||0);

  if(charter>0 && parent>0){
    return 'Split funding';
  }

  if(charter>0){
    return 'Charter funded';
  }

  return 'Parent funded';
}


function renderStudentsServices(){

  refreshStudentServiceSelectors();

  const count=$('#coreStudentCount');

  if(count){
    count.textContent=
      `${students.length} student${students.length===1?'':'s'}`;
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
    [...students]
      .sort(
        (a,b)=>
          (a.studentName||'')
            .localeCompare(b.studentName||'')
      )
      .map(student=>{

        const studentServiceList=
          studentServices(student.id);

        const serviceHTML=
          studentServiceList.length
            ? studentServiceList
                .map(service=>{

                  return `
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

                          ${service.schedule
                            ? `<span>${esc(service.schedule)}</span>`
                            : ''}

                          ${service.serviceType==='Tutoring' &&
                            Number(service.tutoringRate||0)>0
                            ? `<span>
                                ${money(service.tutoringRate)}
                                tutoring rate
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
                                ${money(service.lateFee)}
                                late fee
                               </span>`
                            : ''}

                        </div>

                      </div>


                      <div class="vf-service-money">

                        <div>
                          <small>Total</small>
                          <strong>
                            ${money(service.totalPrice)}
                          </strong>
                        </div>

                        <div>
                          <small>Charter</small>
                          <strong>
                            ${money(service.charterExpected)}
                          </strong>
                        </div>

                        <div>
                          <small>Parent</small>
                          <strong>
                            ${money(service.parentExpected)}
                          </strong>
                        </div>

                        <span class="vf-status-pill">
                          ${esc(fundingLabel(service))}
                        </span>

                      </div>

                    </div>
                  `;
                })
                .join('')

            : `
                <div class="vf-service-empty">
                  No service/payment plan set up yet.
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


function updateFundingPreview(){

  const box=$('#fundingPreview');

  if(!box) return;

  const total=
    Number($('#serviceTotal')?.value||0);

  const charter=
    Number($('#serviceCharterExpected')?.value||0);

  const rawParent=
    $('#serviceParentExpected')?.value ?? '';

  const parent=
    rawParent==='' && total>0
      ? Math.max(0,total-charter)
      : Number(rawParent||0);

  const difference=
    total-(charter+parent);


  box.innerHTML=`
    <strong>Total:</strong> ${money(total)}
    &nbsp;&nbsp;
    <strong>Charter:</strong> ${money(charter)}
    &nbsp;&nbsp;
    <strong>Parent:</strong> ${money(parent)}

    ${
      total>0 && Math.abs(difference)>.009
        ? `<div class="vf-funding-warning">
             Funding is
             ${money(Math.abs(difference))}
             ${difference>0?'short':'over'}
             the service price.
           </div>`

        : total>0
          ? `<div class="vf-funding-good">
               Funding plan balances correctly.
             </div>`

          : ''
    }
  `;
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


[
  '#serviceTotal',
  '#serviceCharterExpected',
  '#serviceParentExpected'
].forEach(id=>{

  const el=$(id);

  if(el){
    el.addEventListener(
      'input',
      updateFundingPreview
    );
  }
});


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


  updateFundingPreview();
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

  const charterExpected=
    Number($('#serviceCharterExpected').value||0);

  const parentRaw=
    $('#serviceParentExpected').value.trim();

  const parentExpected=
    parentRaw===''
      ? Math.max(0,totalPrice-charterExpected)
      : Number(parentRaw||0);


  if(
    totalPrice>0 &&
    Math.abs(
      totalPrice-
      (charterExpected+parentExpected)
    )>.009
  ){

    return toast(
      'Charter + parent funding must equal the service price.'
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


  const fundingStatus=
    charterExpected>0 && parentExpected>0
      ? 'Split funding'

      : charterExpected>0
        ? 'Charter funded'

        : 'Parent funded';


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

      charterSchool:
        $('#serviceCharterSchool')
          .value
          .trim(),

      charterExpected,

      parentExpected,

      depositExpected:
        Number(
          $('#serviceDepositExpected').value||0
        ),

      fundingStatus,
      status:'Active',

      notes:
        $('#serviceNotes').value.trim(),

      source:'Manual',

      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );


  await log(
    'Service funding plan created',
    `${student.studentName} — ${name}: `+
    `${money(totalPrice)} total; `+
    `${money(charterExpected)} charter; `+
    `${money(parentExpected)} parent.`,
    'Manual'
  );


  [
    '#serviceName',
    '#serviceStart',
    '#serviceEnd',
    '#serviceTotal',
    '#serviceTutoringRate',
    '#serviceCharterSchool',
    '#serviceCharterExpected',
    '#serviceParentExpected',
    '#serviceDepositExpected',
    '#serviceNotes'
  ].forEach(id=>{
    $(id).value='';
  });


  $('#serviceDueDay').value='4';
  $('#serviceLateFee').value='25';

  $('#serviceSchedule').value='Full';
  $('#serviceType').value='Class';

  $('#serviceClass').value='';


  hide($('#serviceForm'));

  await refreshAll();

  toast('Service funding plan saved.');
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

        source:'CSV import',

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

          parentPhone:
            row.parentPhone ||
            coreStudent.parentPhone ||
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

          charterSchool:'',

          charterExpected:0,

          parentExpected:
            totalPrice,

          depositExpected:0,

          fundingStatus:
            'Needs funding setup',

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



function toggle(id){
  $(id).classList.toggle('hidden');
}

$('#addPayment').onclick=()=>toggle('#paymentForm');

$('#savePayment').onclick=async()=>{
  let amount=Number($('#payAmount').value);

  if(!amount)return toast('Enter an amount.');

  let d={
    date:$('#payDate').value||new Date().toISOString().slice(0,10),
    payer:$('#payPayer').value.trim(),
    student:$('#payStudent').value.trim(),
    className:$('#payClass').value.trim(),
    amount,
    method:$('#payMethod').value,
    source:'Manual',
    createdAt:serverTimestamp()
  };

  await addDoc(sub('payments'),d);

  await log(
    'Payment recorded',
    `${d.payer||d.student} — $${amount.toFixed(2)} via ${d.method}.`,
    'Manual'
  );

  hide($('#paymentForm'));

  await refreshAll();
};

$('#addCertificate').onclick=()=>toggle('#certificateForm');

$('#saveCertificate').onclick=async()=>{
  let d={
    student:$('#certStudent').value.trim(),
    school:$('#certSchool').value.trim(),
    amount:Number($('#certAmount').value)||0,
    number:$('#certNumber').value.trim(),
    status:$('#certStatus').value,
    source:'Manual',
    createdAt:serverTimestamp()
  };

  if(!d.student)
    return toast('Enter student name.');

  await addDoc(sub('certificates'),d);

  await log(
    'Certificate added',
    `${d.school||'Charter'} certificate for ${d.student} — $${d.amount.toFixed(2)}.`,
    'Manual'
  );

  hide($('#certificateForm'));

  await refreshAll();
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
          <div class="meta">${esc(d.date)} · ${esc(d.method)} · ${esc(d.student)} · ${esc(d.className)}</div>
        </div>`
      ).join('')
    : '<div class="empty">No payments yet.</div>';

  $('#certificateList').innerHTML=
    certs.length
    ? certs.map(d=>
        `<div class="record">
          <strong>${esc(d.student)} — $${Number(d.amount).toFixed(2)}</strong>
          <div class="meta">${esc(d.school)} · ${esc(d.number)} · ${esc(d.status)}</div>
        </div>`
      ).join('')
    : '<div class="empty">No certificates yet.</div>';

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
  $('#reviewList').innerHTML=
    reviews.length
    ? reviews.map(d=>
        `<div class="record">
          <strong>${esc(d.title)}</strong>
          <div class="meta">${esc(d.detail)}</div>
        </div>`
      ).join('')
    : '<div class="empty">Nothing needs review.</div>';
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
    classes:'Classes & Rosters',
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
