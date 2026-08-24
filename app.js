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
  runTransaction,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCjAnrOfpmDMGB3O5x9i0yDZ-JR8NZMa0o",authDomain:"vendorflow-68828.firebaseapp.com",projectId:"vendorflow-68828",storageBucket:"vendorflow-68828.firebasestorage.app",messagingSenderId:"803061946107",appId:"1:803061946107:web:fe9622dd2d0c1c5c13c25e"};



const VENDORFLOW_API =
  "https://vendorflow-api.tbed63.workers.dev";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],show=e=>e.classList.remove("hidden"),hide=e=>e.classList.add("hidden"),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
let user=null,profile={},classes=[],roster=[],students=[],services=[],obligations=[],charterSchools=[],payments=[],certs=[],invoices=[],compliance=[],reviews=[],history=[],ignoredStatementPayers=[],authMode="login",step=0,answers={},preview=[],map={},headers=[];
let invoiceStatusFilter='all';
let invoiceSearchQuery='';

let invoiceAdvancedFilters={
  charter:'',
  student:'',
  service:'',
  dateFrom:'',
  dateTo:'',
  amountMin:'',
  amountMax:''
};

let inboundEmailPromise=null;
let editingCharterSchoolId='';
let selectedPaymentStudentId=null;
let pendingCertificatePdf=null;
let editingRosterStudentId=null;
let editingCertificateId='';
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

    charters:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V5h16v16"/>
      <path d="M8 9h2M14 9h2M8 13h2M14 13h2"/>
      <path d="M10 21v-4h4v4"/>
      <path d="M7 5V3h10v2"/>
    </svg>`,

    students:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="7.5" r="3"/>
      <path d="M3.5 19c.5-4 2.6-6 5.5-6s5 2 5.5 6"/>
      <path d="M17 5v8"/>
      <path d="M13 9h8"/>
    </svg>`,

    invoices:`<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18H6z"/>
      <path d="M9 8h6"/>
      <path d="M9 12h6"/>
      <path d="M9 16h4"/>
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

  if(header){
    header.classList.add('vf-app-header');

    /*
     * The centered header logo now lives in index.html.
     * Remove any legacy dynamically injected logo.
     */
    header
      .querySelectorAll('.vf-header-logo')
      .forEach(
        logo=>logo.remove()
      );
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

  /*
   * A vendor finishing setup should always arrive at
   * the Dashboard, where VendorFlow gives next-step guidance.
   */
  switchView('dashboard');
};

async function enterApp(){
  show($('#app'));
  $('#bizNameSide').textContent=profile.businessName||'VendorFlow';
  $('#userEmail').textContent=user.email||'';
  fillProfile();
  await refreshAll();
}

async function log(
  action,
  detail,
  source='Manual',
  evidence=null
){

  const data={
    action,
    detail,
    source,

    createdAt:
      serverTimestamp()
  };


  if(
    evidence &&
    typeof evidence==='object'
  ){

    data.evidence={
      ...evidence
    };
  }


  await addDoc(
    sub('history'),
    data
  );
}

async function getList(name,ordered=true){
  let c=sub(name);
  let q=ordered?query(c,orderBy('createdAt','desc')):c;
  let s=await getDocs(q);
  return s.docs.map(d=>({id:d.id,...d.data()}));
}


function paymentReviewKey(
  studentId,
  method,
  date,
  amount
){

  return [
    String(studentId||'').trim(),
    String(method||'').trim().toLowerCase(),
    String(date||'').trim(),
    Math.round(
      Number(amount||0)*100
    )
  ].join('|');
}


async function cleanupLegacyPaymentDuplicateReviews(){

  /*
   * Older inbound-payment code created a generic review record:
   *
   *   reviewType: payment
   *
   * The corrected system creates:
   *
   *   reviewType: duplicate
   *   itemType: payment
   *   incoming: {...}
   *
   * Remove an old record ONLY when an exact matching corrected
   * duplicate review already exists. This prevents deleting a
   * legitimate unrelated Needs Review item.
   */

  const properDuplicates=
    reviews.filter(
      review=>
        review.reviewType==='duplicate' &&
        review.itemType==='payment'
    );


  const legacy=
    reviews.filter(
      review=>
        review.reviewType==='payment' &&
        review.itemType==='payment'
    );


  if(
    !properDuplicates.length ||
    !legacy.length
  ){
    return 0;
  }


  const properKeys=
    new Set(
      properDuplicates.map(review=>{

        const incoming=
          review.incoming||{};

        return paymentReviewKey(
          incoming.studentId,
          incoming.method,
          incoming.date,
          incoming.amount
        );
      })
    );


  const stale=
    legacy.filter(
      review=>
        properKeys.has(
          paymentReviewKey(
            review.studentId,
            review.method,
            review.date,
            review.amount
          )
        )
    );


  for(const review of stale){

    await deleteDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'review',
        review.id
      )
    );
  }


  return stale.length;
}



function certificateAttentionIssue(cert){

  if(
    !cert ||
    cert.deleted
  ){
    return null;
  }


  if(!cert.charterSchoolId){

    return {
      code:'missing-charter',
      title:'Certificate needs a charter school',
      detail:
        `${cert.student||'Student'} — ${money(cert.amount)} — `+
        `attach the correct charter school so VendorFlow can schedule the invoice.`
    };
  }


  if(!cert.serviceStartDate){

    return {
      code:'missing-service-dates',
      title:'Certificate needs service dates',
      detail:
        `${cert.student||'Student'} — ${money(cert.amount)} — `+
        `enter the service start date so VendorFlow can calculate when the invoice should be created.`
    };
  }


  if(!cert.invoiceScheduleValid){

    return {
      code:'missing-invoice-schedule',
      title:'Certificate invoice schedule needs attention',
      detail:
        `${cert.student||'Student'} — ${money(cert.amount)} — `+
        `review the charter and service start date so VendorFlow can schedule the invoice.`
    };
  }


  return null;
}



function invoiceNumberingReviewItems(){

  if(profile.invoiceNumberMode){
    return [];
  }


  return invoiceReadyCertificates()
    .map(cert=>({

      id:
        `invoice-numbering-${cert.id}`,

      reviewType:
        'invoice-numbering',

      itemType:
        'invoice',

      certificateId:
        cert.id,

      title:
        'Invoice cannot be prepared yet',

      detail:
        `${cert.student||'Student'} — ${money(cert.amount)} — `+
        `this certificate has reached its invoice date, but VendorFlow cannot prepare the invoice until you choose an invoice numbering system.`,

      source:
        'VendorFlow'
    }));
}


function allNeedsReviewItems(){

  return [
    ...reviews,
    ...invoiceNumberingReviewItems()
  ];
}


function certificateAttentionReviews(){

  return certs
    .map(cert=>{

      const issue=
        certificateAttentionIssue(
          cert
        );

      if(!issue){
        return null;
      }


      return {
        id:
          `certificate-attention-${cert.id}`,

        reviewType:
          'certificate-attention',

        itemType:
          'certificate',

        certificateId:
          cert.id,

        title:
          issue.title,

        detail:
          issue.detail,

        issueCode:
          issue.code,

        student:
          cert.student||'',

        amount:
          Number(cert.amount||0),

        number:
          cert.number||'',

        source:
          'VendorFlow'
      };
    })
    .filter(Boolean);
}


async function refreshAll(){
  classes=await getList('classes',false);

  await repairRosterCoreLinksOnce();

  students=await getList('students',false);
  services=await getList('services',false);
  obligations=await getList('obligations',false);
  charterSchools=await getList('charterSchools',false);
  payments=await getList('payments');

  const ignoredPayerVendorSnap=
    await getDoc(
      vendorDoc()
    );

  const ignoredPayerVendorData=
    ignoredPayerVendorSnap.exists()
      ? ignoredPayerVendorSnap.data()
      : {};

  ignoredStatementPayers=
    Array.isArray(
      ignoredPayerVendorData
        .ignoredStatementPayers
    )
      ? ignoredPayerVendorData
          .ignoredStatementPayers
          .filter(
            rule=>
              rule &&
              rule.payerKey
          )
      : [];

  certs=await getList('certificates');
  invoices=await getList('invoices');

  const createdInvoices=
    await createDueInvoices();

  if(createdInvoices>0){
    invoices=await getList('invoices');
    certs=await getList('certificates');
  }

  compliance=await getList('compliance');
  reviews=await getList('review');

  const removedLegacyReviews=
    await cleanupLegacyPaymentDuplicateReviews();

  if(removedLegacyReviews>0){
    reviews=await getList('review');
  }


  /*
   * Certificate operational issues are derived directly
   * from the certificate records. This makes them impossible
   * to forget and lets them clear automatically when fixed.
   */
  reviews=[
    ...reviews,
    ...certificateAttentionReviews()
  ];


  history=await getList('history');

  const repaired=
    await repairUnmatchedPayments();

  if(repaired>0){
    payments=await getList('payments');
    history=await getList('history');
  }


  /*
   * Reconcile all currently known parent-payment and
   * certificate funding against dated obligations.
   *
   * This is idempotent: it calculates what the records
   * SHOULD look like and only writes actual differences.
   */
  const obligationChanges=
    await reconcileObligationFunding();

  if(obligationChanges>0){
    obligations=
      await getList(
        'obligations',
        false
      );
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
  renderAccountPage();
  renderCharterSchools();
  renderCertificateCharterOptions();
  renderRoster();
  renderArchivedClasses();
  renderStudentsServices();
  renderRefundStudentSelect();
  renderRecords();
  renderChargeRecords();

  renderCertificateReviewPreference();
  renderInvoices();
  renderReviews();
  renderHistory();
}



function vendorAddressParts(){

  let city=
    String(profile.city||'').trim();

  let state=
    String(profile.state||'').trim();

  let zip=
    String(profile.zip||'').trim();


  /*
   * Older onboarding stored these together as:
   * "Encinitas, CA 92024"
   */
  const legacy=
    String(profile.cityStateZip||'').trim();


  if(
    legacy &&
    (!city || !state || !zip)
  ){

    const match=
      legacy.match(
        /^(.+?),\s*([A-Za-z]{2})\s+(.+)$/
      );


    if(match){

      if(!city){
        city=match[1].trim();
      }

      if(!state){
        state=match[2].trim();
      }

      if(!zip){
        zip=match[3].trim();
      }

    }else if(!city){

      city=legacy;
    }
  }


  return {
    street:
      String(profile.address||'').trim(),

    city,
    state,
    zip
  };
}



function renderInboundVendorEmail(){

  const el=
    $('#accountInboundEmail');

  if(!el){
    return;
  }


  el.textContent=
    profile.inboundEmail ||
    'Creating your address...';


  const copy=
    $('#copyInboundEmail');


  if(copy){

    copy.disabled=
      !profile.inboundEmail;


    copy.onclick=
      async()=>{

        if(!profile.inboundEmail){
          return;
        }


        try{

          await navigator.clipboard.writeText(
            profile.inboundEmail
          );

          const old=
            copy.textContent;

          copy.textContent=
            'Copied';

          setTimeout(
            ()=>{
              copy.textContent=
                old;
            },
            1200
          );


        }catch{

          prompt(
            'Copy your VendorFlow email address:',
            profile.inboundEmail
          );
        }
      };
  }
}


async function ensureInboundVendorEmail(){

  if(!user){
    return;
  }


  if(inboundEmailPromise){
    return inboundEmailPromise;
  }


  inboundEmailPromise=
    (async()=>{

      const token=
        await user.getIdToken();


      const response=
        await fetch(
          `${VENDORFLOW_API}/inbound/address`,
          {
            method:'POST',

            headers:{
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                businessName:
                  profile.businessName ||
                  profile.ownerName ||
                  'vendor'
              })
          }
        );


      let data={};


      try{

        data=
          await response.json();

      }catch{}


      if(
        !response.ok ||
        !data.email
      ){

        throw new Error(
          data.detail ||
          data.error ||
          'VendorFlow email address could not be created.'
        );
      }


      const email=
        String(
          data.email
        ).trim();


      if(
        profile.inboundEmail !==
        email
      ){

        profile.inboundEmail=
          email;


        await setDoc(
          vendorDoc(),
          {
            inboundEmail:
              email,

            updatedAt:
              serverTimestamp()
          },
          {
            merge:true
          }
        );
      }


      renderInboundVendorEmail();


      return email;
    })();


  try{

    return await inboundEmailPromise;

  }catch(error){

    inboundEmailPromise=null;

    throw error;
  }
}


function renderAccountPage(){

  renderInboundVendorEmail();

  ensureInboundVendorEmail()
    .catch(error=>{

      console.error(
        'VendorFlow inbound email:',
        error
      );

      const el=
        $('#accountInboundEmail');

      if(el){
        el.textContent=
          'Could not create address';
      }
    });


  const subscription=
    profile.subscriptionLevel ||
    profile.subscription ||
    'VendorFlow Beta';


  const address=
    vendorAddressParts();


  const subscriptionEl=
    $('#accountSubscription');

  const emailEl=
    $('#accountEmail');


  if(subscriptionEl){
    subscriptionEl.textContent=
      subscription;
  }


  if(emailEl){
    emailEl.textContent=
      user?.email ||
      'Not available';
  }


  const initialEl=
    $('#accountInitial');

  if(initialEl){

    const source=
      profile.businessName ||
      profile.ownerName ||
      user?.email ||
      'V';

    initialEl.textContent=
      String(source)
        .trim()
        .charAt(0)
        .toUpperCase() || 'V';
  }


  const fields={

    accountOwnerInput:
      profile.ownerName ||
      user?.displayName ||
      '',

    accountBusinessInput:
      profile.businessName || '',

    accountStreetInput:
      address.street,

    accountCityInput:
      address.city,

    accountStateInput:
      address.state,

    accountZipInput:
      address.zip,

    accountPhoneInput:
      profile.phone || ''
  };


  for(
    const [id,value]
    of Object.entries(fields)
  ){

    const el=
      document.getElementById(id);

    if(el){
      el.value=value;
    }
  }
}


function charterDisplayAddress(charter){

  return [
    charter.address,
    charter.city,
    [
      charter.state,
      charter.zip
    ].filter(Boolean).join(' ')
  ]
    .filter(Boolean)
    .join(', ');
}


function resetCharterForm(){

  editingCharterSchoolId='';

  $('#charterFormTitle').textContent=
    'Add charter school';

  $('#charterName').value='';
  $('#charterBillingEmail').value='';
  $('#charterPhone').value='';
  $('#charterContactName').value='';
  $('#charterContactEmail').value='';
  $('#charterAddress').value='';
  $('#charterCity').value='';
  $('#charterState').value='';
  $('#charterZip').value='';
  $('#charterInvoiceDays').value='14';

  if($('#charterPaymentTerms')){
    $('#charterPaymentTerms').value='30';
  }

  $('#charterNotes').value='';

  $('#saveCharterSchool').textContent=
    'Save charter school';
}


function openCharterEditor(id=''){

  resetCharterForm();

  if(id){

    const charter=
      charterSchools.find(
        c=>c.id===id
      );

    if(!charter)return;

    editingCharterSchoolId=id;

    $('#charterFormTitle').textContent=
      'Edit charter school';

    $('#charterName').value=
      charter.name||'';

    $('#charterBillingEmail').value=
      charter.billingEmail||'';

    $('#charterPhone').value=
      charter.phone||'';

    $('#charterContactName').value=
      charter.contactName||'';

    $('#charterContactEmail').value=
      charter.contactEmail||'';

    $('#charterAddress').value=
      charter.address||'';

    $('#charterCity').value=
      charter.city||'';

    $('#charterState').value=
      charter.state||'';

    $('#charterZip').value=
      charter.zip||'';

    $('#charterInvoiceDays').value=
      Number.isFinite(
        Number(charter.invoiceDaysAfterStart)
      )
        ? Number(charter.invoiceDaysAfterStart)
        : 14;


    if($('#charterPaymentTerms')){

      $('#charterPaymentTerms').value=
        String(
          invoicePaymentTermsDays(
            charter.paymentTermsDays
          )
        );
    }


    $('#charterNotes').value=
      charter.notes||'';

    $('#saveCharterSchool').textContent=
      'Save changes';
  }

  show($('#charterForm'));
  $('#charterName').focus();
}


function renderCharterSchools(){

  const list=
    $('#charterSchoolList');

  if(!list)return;

  const active=
    charterSchools
      .filter(c=>!c.archived)
      .sort(
        (a,b)=>
          (a.name||'')
            .localeCompare(b.name||'')
      );

  if(!active.length){

    list.innerHTML=`
      <div class="card vf-empty-charters">
        <strong>No charter schools saved yet.</strong>
        <p>
          Add the first charter school you work with.
          VendorFlow will reuse its billing and address
          information when preparing invoices.
        </p>
      </div>
    `;

  }else{

    list.innerHTML=
      active.map(charter=>{

        const days=
          Number.isFinite(
            Number(charter.invoiceDaysAfterStart)
          )
            ? Number(charter.invoiceDaysAfterStart)
            : 14;

        return `
          <div class="card vf-charter-card">

            <div class="vf-charter-card-main">

              <div>
                <div class="eyebrow">Charter school</div>
                <h3>${esc(charter.name||'Unnamed charter')}</h3>
              </div>

              <button
                data-edit-charter="${charter.id}">
                Edit
              </button>

            </div>

            <div class="vf-charter-details">

              <div>
                <small>Billing email</small>
                <strong>
                  ${esc(charter.billingEmail||'Not entered')}
                </strong>
              </div>

              <div>
                <small>Invoice address</small>
                <strong>
                  ${esc(charterDisplayAddress(charter)||'Not entered')}
                </strong>
              </div>

              <div>
                <small>Invoice timing</small>
                <strong>
                  ${days} day${days===1?'':'s'} after certificate start
                </strong>
              </div>

              <div>
                <small>Contact</small>
                <strong>
                  ${esc(
                    charter.contactName ||
                    charter.contactEmail ||
                    charter.phone ||
                    'Not entered'
                  )}
                </strong>
              </div>

            </div>

            <div class="vf-charter-card-actions">
              <button
                data-archive-charter="${charter.id}">
                Archive
              </button>
            </div>

          </div>
        `;
      }).join('');
  }

  $$('[data-edit-charter]')
    .forEach(button=>{

      button.onclick=()=>{

        openCharterEditor(
          button.dataset.editCharter
        );
      };
    });


  $$('[data-archive-charter]')
    .forEach(button=>{

      button.onclick=async()=>{

        const charter=
          charterSchools.find(
            c=>c.id===button.dataset.archiveCharter
          );

        if(!charter)return;

        const ok=
          confirm(
            `Archive ${charter.name}?\n\n` +
            `Certificates and invoice history will remain. ` +
            `You can restore the charter later.`
          );

        if(!ok)return;

        await setDoc(
          doc(
            db,
            'vendors',
            user.uid,
            'charterSchools',
            charter.id
          ),
          {
            archived:true,
            archivedAt:serverTimestamp(),
            updatedAt:serverTimestamp()
          },
          {
            merge:true
          }
        );

        await log(
          'Charter school archived',
          charter.name,
          'Manual'
        );

        await refreshAll();

        toast(
          'Charter school archived.'
        );
      };
    });


  renderArchivedCharterSchools();
}


function renderArchivedCharterSchools(){

  const list=
    $('#archivedCharterList');

  if(!list)return;

  const archived=
    charterSchools
      .filter(c=>c.archived)
      .sort(
        (a,b)=>
          (a.name||'')
            .localeCompare(b.name||'')
      );

  if(!archived.length){

    list.innerHTML=
      '<div class="empty">No archived charter schools.</div>';

    return;
  }

  list.innerHTML=
    archived.map(charter=>`
      <div class="vf-archived-charter">

        <div>
          <strong>
            ${esc(charter.name||'Unnamed charter')}
          </strong>

          <span>
            ${esc(
              charterDisplayAddress(charter) ||
              charter.billingEmail ||
              ''
            )}
          </span>
        </div>

        <button
          data-restore-charter="${charter.id}">
          Restore
        </button>

      </div>
    `).join('');


  $$('[data-restore-charter]')
    .forEach(button=>{

      button.onclick=async()=>{

        const charter=
          charterSchools.find(
            c=>c.id===button.dataset.restoreCharter
          );

        if(!charter)return;

        await setDoc(
          doc(
            db,
            'vendors',
            user.uid,
            'charterSchools',
            charter.id
          ),
          {
            archived:false,
            restoredAt:serverTimestamp(),
            updatedAt:serverTimestamp()
          },
          {
            merge:true
          }
        );

        await log(
          'Charter school restored',
          charter.name,
          'Manual'
        );

        await refreshAll();

        toast(
          'Charter school restored.'
        );
      };
    });
}





function selectedCertificateStudent(){

  const id=
    $('#certStudentId')?.value || '';

  if(!id){
    return null;
  }

  return students.find(
    student=>student.id===id
  ) || null;
}


function clearCertificateStudentLink(
  keepText=true
){

  if($('#certStudentId')){
    $('#certStudentId').value='';
  }

  if($('#certStudentLinked')){
    $('#certStudentLinked').innerHTML='';
    hide($('#certStudentLinked'));
  }

  if($('#certStudentMatches')){
    $('#certStudentMatches').innerHTML='';
    hide($('#certStudentMatches'));
  }

  if(!keepText && $('#certStudent')){
    $('#certStudent').value='';
  }
}


function linkCertificateStudent(
  student
){

  if(!student){
    return;
  }

  $('#certStudentId').value=
    student.id;

  $('#certStudent').value=
    student.studentName||'';


  const linked=
    $('#certStudentLinked');

  linked.innerHTML=`
    <div>
      <strong>
        Linked to ${esc(student.studentName||'Student')}
      </strong>

      <span>
        ${
          student.parentName
            ? esc(student.parentName)
            : 'Parent not entered'
        }
        ${
          student.parentEmail
            ? ' · '+esc(student.parentEmail)
            : ''
        }
        ${
          student.parentPhone
            ? ' · '+esc(student.parentPhone)
            : ''
        }
      </span>
    </div>

    <button
      type="button"
      id="changeCertificateStudent">
      Change
    </button>
  `;

  show(linked);

  hide(
    $('#certStudentMatches')
  );


  $('#changeCertificateStudent').onclick=()=>{

    clearCertificateStudentLink(
      true
    );

    $('#certStudent').focus();

    renderCertificateStudentMatches();
  };
}


function certificateStudentMatches(){

  const query=
    String(
      $('#certStudent')?.value || ''
    )
      .trim()
      .toLowerCase();

  if(!query){
    return [];
  }

  return students
    .filter(
      student=>
        studentSearchHaystack(
          student
        ).includes(query)
    )
    .sort(
      (a,b)=>
        String(a.studentName||'')
          .localeCompare(
            String(b.studentName||'')
          )
    )
    .slice(0,8);
}


function renderCertificateStudentMatches(){

  const input=
    $('#certStudent');

  const box=
    $('#certStudentMatches');

  if(!input || !box){
    return;
  }


  if(selectedCertificateStudent()){

    hide(box);
    return;
  }


  const typed=
    input.value.trim();

  if(!typed){

    box.innerHTML='';
    hide(box);
    return;
  }


  const matches=
    certificateStudentMatches();


  if(!matches.length){

    box.innerHTML=`
      <div class="vf-cert-student-no-match">
        <strong>No student found.</strong>
        <span>
          Add the student in Class Rosters or Students & Services
          before assigning a certificate.
        </span>
      </div>
    `;

    show(box);
    return;
  }


  box.innerHTML=
    matches.map(
      student=>`
        <button
          type="button"
          class="vf-cert-student-match"
          data-cert-student-id="${student.id}">

          <strong>
            ${esc(student.studentName||'Unnamed student')}
          </strong>

          <span>
            ${esc(student.parentName||'')}
            ${
              student.parentEmail
                ? ' · '+esc(student.parentEmail)
                : ''
            }
            ${
              student.parentPhone
                ? ' · '+esc(student.parentPhone)
                : ''
            }
          </span>

        </button>
      `
    ).join('');


  $$('[data-cert-student-id]')
    .forEach(button=>{

      button.onclick=()=>{

        const student=
          students.find(
            item=>
              item.id===
              button.dataset.certStudentId
          );

        if(student){

          linkCertificateStudent(
            student
          );
        }
      };
    });


  show(box);
}


function tryExactCertificateStudentLink(){

  if(selectedCertificateStudent()){
    return;
  }

  const typed=
    normalizedName(
      $('#certStudent')?.value || ''
    );

  if(!typed){
    return;
  }

  const exact=
    students.find(
      student=>
        normalizedName(
          student.studentName
        )===typed
    );

  if(exact){

    linkCertificateStudent(
      exact
    );
  }
}


if($('#certStudent')){

  $('#certStudent').addEventListener(
    'input',
    ()=>{

      const linked=
        selectedCertificateStudent();

      if(
        linked &&
        normalizedName(
          $('#certStudent').value
        )!==
        normalizedName(
          linked.studentName
        )
      ){

        clearCertificateStudentLink(
          true
        );
      }

      renderCertificateStudentMatches();
    }
  );


  $('#certStudent').addEventListener(
    'focus',
    renderCertificateStudentMatches
  );


  $('#certStudent').addEventListener(
    'blur',
    ()=>{

      setTimeout(
        tryExactCertificateStudentLink,
        150
      );
    }
  );
}


function selectedCertificateCharter(){

  const id=
    $('#certCharterSchoolId')?.value || '';

  if(!id){
    return null;
  }

  return charterSchools.find(
    charter=>
      charter.id===id &&
      !charter.archived
  ) || null;
}


function clearCertificateCharterLink(
  keepText=true
){

  const hidden=
    $('#certCharterSchoolId');

  const linked=
    $('#certCharterLinked');

  const matches=
    $('#certCharterMatches');

  if(hidden){
    hidden.value='';
  }

  if(linked){
    linked.innerHTML='';
    hide(linked);
  }

  if(matches){
    matches.innerHTML='';
    hide(matches);
  }

  if(!keepText && $('#certSchool')){
    $('#certSchool').value='';
  }
}


function linkCertificateCharter(
  charter
){

  if(!charter){
    return;
  }

  $('#certCharterSchoolId').value=
    charter.id;

  $('#certSchool').value=
    charter.name||'';

  /*
   * Saved charter billing information becomes the default.
   * A certificate-specific billing email can still be edited.
   */
  if(
    charter.billingEmail &&
    !$('#certBillingEmail').value.trim()
  ){
    $('#certBillingEmail').value=
      charter.billingEmail;
  }


  const linked=
    $('#certCharterLinked');

  linked.innerHTML=`
    <div>
      <strong>
        Linked to ${esc(charter.name||'Charter school')}
      </strong>

      <span>
        ${
          charter.billingEmail
            ? esc(charter.billingEmail)
            : 'No billing email saved'
        }
        ·
        ${
          Number.isFinite(
            Number(charter.invoiceDaysAfterStart)
          )
            ? Number(charter.invoiceDaysAfterStart)
            : 14
        } day invoice timing
      </span>
    </div>

    <button
      type="button"
      id="changeCertificateCharter">
      Change
    </button>
  `;

  show(linked);

  hide(
    $('#certCharterMatches')
  );


  $('#changeCertificateCharter').onclick=()=>{

    clearCertificateCharterLink(
      true
    );

    $('#certSchool').focus();

    renderCertificateCharterMatches();
  };
}


function certificateCharterMatches(){

  const query=
    normalizedCharterName(
      $('#certSchool')?.value || ''
    );

  if(!query){
    return [];
  }

  return charterSchools
    .filter(
      charter=>
        !charter.archived &&
        normalizedCharterName(
          charter.name
        ).includes(query)
    )
    .sort(
      (a,b)=>
        String(a.name||'')
          .localeCompare(
            String(b.name||'')
          )
    )
    .slice(0,8);
}


function renderCertificateCharterMatches(){

  const input=
    $('#certSchool');

  const box=
    $('#certCharterMatches');

  if(!input || !box){
    return;
  }


  if(selectedCertificateCharter()){

    hide(box);
    return;
  }


  const typed=
    input.value.trim();

  if(!typed){

    box.innerHTML='';
    hide(box);
    return;
  }


  const matches=
    certificateCharterMatches();


  const matchHTML=
    matches.map(
      charter=>`
        <button
          type="button"
          class="vf-cert-charter-match"
          data-cert-charter-id="${charter.id}">

          <strong>
            ${esc(charter.name||'Unnamed charter')}
          </strong>

          <span>
            ${esc(
              charterDisplayAddress(charter) ||
              charter.billingEmail ||
              'Saved charter'
            )}
          </span>

        </button>
      `
    ).join('');


  box.innerHTML=`
    ${matchHTML}

    <button
      type="button"
      class="vf-cert-charter-add"
      id="addCertificateCharter">

      <strong>
        + Add new charter school
      </strong>

      <span>
        ${typed
          ? `Create “${esc(typed)}” in your charter bank`
          : 'Add a charter school'
        }
      </span>

    </button>
  `;


  $$('[data-cert-charter-id]')
    .forEach(button=>{

      button.onclick=()=>{

        const charter=
          charterSchools.find(
            item=>
              item.id===
              button.dataset.certCharterId
          );

        if(charter){
          linkCertificateCharter(
            charter
          );
        }
      };
    });


  $('#addCertificateCharter').onclick=()=>{

    const name=
      $('#certSchool').value.trim();

    /*
     * Preserve the certificate form while the vendor adds
     * a charter record in the Charter Schools section.
     */
    sessionStorage.setItem(
      'vendorflowPendingCertificateCharter',
      JSON.stringify({
        name,
        student:
          $('#certStudent')?.value || '',
        amount:
          $('#certAmount')?.value || '',
        number:
          $('#certNumber')?.value || '',
        issueDate:
          $('#certIssueDate')?.value || '',
        serviceStart:
          $('#certServiceStart')?.value || '',
        serviceEnd:
          $('#certServiceEnd')?.value || '',
        billingEmail:
          $('#certBillingEmail')?.value || '',
        serviceDescription:
          $('#certServiceDescription')?.value || '',
        invoiceInstructions:
          $('#certInvoiceInstructions')?.value || '',
        notes:
          $('#certNotes')?.value || ''
      })
    );


    switchView(
      'charters'
    );


    openCharterEditor();


    $('#charterName').value=
      name;
  };


  show(box);
}


function restorePendingCertificateAfterCharterSave(
  charter
){

  const raw=
    sessionStorage.getItem(
      'vendorflowPendingCertificateCharter'
    );

  if(!raw){
    return;
  }


  let pending=null;

  try{
    pending=JSON.parse(raw);
  }catch{
    pending=null;
  }


  sessionStorage.removeItem(
    'vendorflowPendingCertificateCharter'
  );


  if(!pending){
    return;
  }


  switchView(
    'certificates'
  );


  show(
    $('#certificateForm')
  );


  $('#certStudent').value=
    pending.student||'';

  $('#certAmount').value=
    pending.amount||'';

  $('#certNumber').value=
    pending.number||'';

  $('#certIssueDate').value=
    pending.issueDate||'';

  $('#certServiceStart').value=
    pending.serviceStart||'';

  $('#certServiceEnd').value=
    pending.serviceEnd||'';

  $('#certBillingEmail').value=
    pending.billingEmail||'';

  $('#certServiceDescription').value=
    pending.serviceDescription||'';

  $('#certInvoiceInstructions').value=
    pending.invoiceInstructions||'';

  $('#certNotes').value=
    pending.notes||'';


  linkCertificateCharter(
    charter
  );


  toast(
    'Charter school added and linked to this certificate.'
  );
}


if($('#certSchool')){

  $('#certSchool').addEventListener(
    'input',
    ()=>{

      /*
       * Editing the text after a selection breaks the link
       * until the vendor explicitly selects a charter again.
       */
      const linked=
        selectedCertificateCharter();

      if(
        linked &&
        normalizedCharterName(
          $('#certSchool').value
        )!==
        normalizedCharterName(
          linked.name
        )
      ){
        clearCertificateCharterLink(
          true
        );
      }

      renderCertificateCharterMatches();
    }
  );


  $('#certSchool').addEventListener(
    'focus',
    renderCertificateCharterMatches
  );
}


function normalizedCharterName(value){

  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,' ');
}


/*
 * Strong comparison form used only for matching.
 *
 * Examples:
 *
 * Pacific Coast Academy
 * Pacific Coast Academy (PCA)
 *
 * both become:
 *
 * pacific coast academy
 *
 * We deliberately remove only a TRAILING parenthetical
 * abbreviation/name note. We do not broadly delete words.
 */
function comparableCharterName(value){

  return normalizedCharterName(
    value
  )
    .replace(
      /\s*\([^)]{1,30}\)\s*$/,
      ''
    )
    .replace(
      /[.,]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


function savedCharterAliases(
  charter
){

  const raw=
    Array.isArray(
      charter?.aliases
    )
      ? charter.aliases
      : [];


  return raw
    .map(
      alias=>
        String(alias||'').trim()
    )
    .filter(Boolean);
}


function resolveSavedCharterMatch(
  name
){

  const typed=
    String(name||'').trim();

  const normalized=
    normalizedCharterName(
      typed
    );

  const comparable=
    comparableCharterName(
      typed
    );


  if(!normalized){

    return {
      charter:null,
      type:'none',
      candidates:[]
    };
  }


  const active=
    charterSchools.filter(
      charter=>
        !charter.archived
    );


  /*
   * 1. Exact saved charter name.
   */
  const exact=
    active.filter(
      charter=>
        normalizedCharterName(
          charter.name
        )===normalized
    );


  if(exact.length===1){

    return {
      charter:exact[0],
      type:'exact',
      candidates:exact
    };
  }


  /*
   * 2. Exact remembered alias.
   */
  const aliasMatches=
    active.filter(
      charter=>
        savedCharterAliases(
          charter
        ).some(
          alias=>
            normalizedCharterName(
              alias
            )===normalized
        )
    );


  if(aliasMatches.length===1){

    return {
      charter:aliasMatches[0],
      type:'alias',
      candidates:aliasMatches
    };
  }


  /*
   * 3. Strong canonical match.
   *
   * This safely handles cases such as:
   *
   * Pacific Coast Academy
   * Pacific Coast Academy (PCA)
   */
  const comparableMatches=
    comparable
      ? active.filter(
          charter=>
            comparableCharterName(
              charter.name
            )===comparable ||
            savedCharterAliases(
              charter
            ).some(
              alias=>
                comparableCharterName(
                  alias
                )===comparable
            )
        )
      : [];


  if(comparableMatches.length===1){

    return {
      charter:comparableMatches[0],
      type:'strong',
      candidates:comparableMatches
    };
  }


  /*
   * 4. Suggestions only.
   *
   * These are NOT automatically accepted. If more than one
   * school could plausibly be intended, the vendor chooses.
   */
  const suggestions=
    comparable
      ? active.filter(
          charter=>{

            const candidate=
              comparableCharterName(
                charter.name
              );


            if(!candidate){
              return false;
            }


            return (
              candidate.includes(
                comparable
              ) ||
              comparable.includes(
                candidate
              )
            );
          }
        )
      : [];


  return {
    charter:null,
    type:
      suggestions.length
        ? 'suggestions'
        : 'none',
    candidates:
      suggestions.slice(0,6)
  };
}


function findSavedCharterByName(name){

  return (
    resolveSavedCharterMatch(
      name
    ).charter ||
    null
  );
}


async function rememberCharterAlias(
  charter,
  alias
){

  if(
    !charter ||
    !charter.id ||
    !user
  ){
    return;
  }


  const clean=
    String(alias||'').trim();


  if(!clean){
    return;
  }


  const normalized=
    normalizedCharterName(
      clean
    );


  if(
    normalizedCharterName(
      charter.name
    )===normalized
  ){
    return;
  }


  const existing=
    savedCharterAliases(
      charter
    );


  if(
    existing.some(
      value=>
        normalizedCharterName(
          value
        )===normalized
    )
  ){
    return;
  }


  const aliases=[
    ...existing,
    clean
  ];


  await setDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'charterSchools',
      charter.id
    ),
    {
      aliases,
      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  charter.aliases=
    aliases;
}


function parseVendorDate(value){

  const text=
    String(value||'').trim();

  if(!text){
    return null;
  }


  /*
   * ISO date: 2026-09-14
   */
  let match=
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

  if(match){

    const year=Number(match[1]);
    const month=Number(match[2]);
    const day=Number(match[3]);

    const date=
      new Date(
        year,
        month-1,
        day,
        12,
        0,
        0,
        0
      );

    if(
      date.getFullYear()===year &&
      date.getMonth()===month-1 &&
      date.getDate()===day
    ){
      return date;
    }

    return null;
  }


  /*
   * US date: 9/14/2026
   */
  match=
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if(match){

    const month=Number(match[1]);
    const day=Number(match[2]);
    const year=Number(match[3]);

    const date=
      new Date(
        year,
        month-1,
        day,
        12,
        0,
        0,
        0
      );

    if(
      date.getFullYear()===year &&
      date.getMonth()===month-1 &&
      date.getDate()===day
    ){
      return date;
    }

    return null;
  }


  /*
   * Certificate extraction may return a readable date such as
   * "September 14, 2026". Use browser parsing only as a final
   * fallback, then normalize it to local noon.
   */
  const fallback=
    new Date(text);

  if(
    Number.isNaN(
      fallback.getTime()
    )
  ){
    return null;
  }

  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
    12,
    0,
    0,
    0
  );
}


function dateToLocalISO(date){

  if(
    !date ||
    Number.isNaN(date.getTime())
  ){
    return '';
  }

  const year=
    date.getFullYear();

  const month=
    String(
      date.getMonth()+1
    ).padStart(2,'0');

  const day=
    String(
      date.getDate()
    ).padStart(2,'0');

  return `${year}-${month}-${day}`;
}


function formatVendorDate(value){

  const date=
    value instanceof Date
      ? value
      : parseVendorDate(value);

  if(!date){
    return '';
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:'short',
      day:'numeric',
      year:'numeric'
    }
  );
}


function uniqueTutoringClassForStudent(
  studentId
){

  if(!studentId){
    return null;
  }


  const tutoringServices=
    services.filter(
      service=>
        service.studentId===studentId &&
        service.status!=='Dropped' &&
        service.status!=='Removed' &&
        service.classId
    );


  const ids=[
    ...new Set(
      tutoringServices
        .map(
          service=>service.classId
        )
        .filter(Boolean)
    )
  ];


  const tutoringClasses=
    ids
      .map(
        id=>
          classes.find(
            c=>
              c.id===id &&
              c.classType==='Tutoring' &&
              !c.archived
          )
      )
      .filter(Boolean);


  /*
   * Never guess between multiple tutoring classes.
   */
  return tutoringClasses.length===1
    ? tutoringClasses[0]
    : null;
}


function certificateInvoiceSchedule(
  serviceStartDate,
  charter,
  studentId=''
){

  const start=
    parseVendorDate(
      serviceStartDate
    );

  if(!start){

    return {
      readyDate:'',
      days:null,
      valid:false,
      source:''
    };
  }


  const tutoringClass=
    uniqueTutoringClassForStudent(
      studentId
    );


  const tutoringDays=
    Number(
      tutoringClass?.invoiceDaysAfterStart
    );


  const charterDays=
    Number(
      charter?.invoiceDaysAfterStart
    );


  /*
   * Tutoring certificates use the vendor's tutoring-class
   * setting. Other certificates keep the proven existing
   * charter-record setting.
   */
  const rawDays=
    tutoringClass &&
    Number.isFinite(tutoringDays)

      ? tutoringDays

      : charterDays;


  const days=
    Number.isFinite(rawDays)
      ? Math.max(
          0,
          Math.min(
            365,
            Math.round(rawDays)
          )
        )
      : 14;


  const ready=
    new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      12,
      0,
      0,
      0
    );


  ready.setDate(
    ready.getDate()+days
  );


  return {
    readyDate:
      dateToLocalISO(ready),

    days,

    valid:true,

    source:
      tutoringClass
        ? 'Tutoring class'
        : 'Charter school settings',

    tutoringClassId:
      tutoringClass?.id || '',

    tutoringClassName:
      tutoringClass?.name || ''
  };
}


function certificateIsInvoiceReady(cert){

  if(
    cert.status!=='Received - Not Billed'
  ){
    return false;
  }

  if(!cert.invoiceReadyDate){
    return false;
  }

  const ready=
    parseVendorDate(
      cert.invoiceReadyDate
    );

  if(!ready){
    return false;
  }

  const today=
    new Date();

  const todayOnly=
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
      0
    );

  return ready<=todayOnly;
}


function invoiceReadyCertificates(){

  return certs.filter(
    certificateIsInvoiceReady
  );
}




function smartTitleCase(value){

  const text=
    String(value||'').trim();

  if(!text){
    return '';
  }

  return text
    .toLowerCase()
    .replace(
      /\b([a-z])/g,
      match=>match.toUpperCase()
    );
}


function formatState(value){

  return String(value||'')
    .trim()
    .toUpperCase();
}


function formattedInvoiceCityLine(
  city,
  state,
  zip
){

  const cityText=
    smartTitleCase(city);

  const stateZip=
    [
      formatState(state),
      String(zip||'').trim()
    ]
      .filter(Boolean)
      .join(' ');

  return [
    cityText,
    stateZip
  ]
    .filter(Boolean)
    .join(', ');
}


function invoiceCreatedDate(invoice){

  if(
    invoice?.createdAt?.toDate
  ){
    return invoice.createdAt.toDate();
  }

  if(invoice?.invoiceDate){

    return parseVendorDate(
      invoice.invoiceDate
    );
  }

  return null;
}


function formatInvoiceDate(invoice){

  const date=
    invoiceCreatedDate(invoice);

  if(!date){
    return '';
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:'short',
      day:'numeric',
      year:'numeric'
    }
  );
}


function invoiceServicePeriod(invoice){

  const start=
    formatVendorDate(
      invoice.serviceStartDate
    );

  const end=
    formatVendorDate(
      invoice.serviceEndDate
    );

  if(start && end){
    return `${start} – ${end}`;
  }

  return start || end || '';
}



function incrementInvoiceSequenceNumber(
  value
){

  const text=
    String(value||'').trim();

  /*
   * Preserve everything around the FINAL run of digits.
   *
   * 26-57      -> 26-58
   * 2026-0057  -> 2026-0058
   * INV-099-A  -> INV-100-A
   */
  const match=
    text.match(
      /^(.*?)(\d+)(\D*)$/
    );


  if(!match){
    return '';
  }


  const prefix=
    match[1];

  const digits=
    match[2];

  const suffix=
    match[3];


  const nextNumber=
    String(
      Number(digits)+1
    )
      .padStart(
        digits.length,
        '0'
      );


  return (
    prefix +
    nextNumber +
    suffix
  );
}


function invoiceNumberSequenceValid(
  value
){

  const text=
    String(value||'').trim();

  return Boolean(
    text &&
    incrementInvoiceSequenceNumber(
      text
    )
  );
}


function updateInvoiceNumberingUI(){

  const auto=
    $('#invoiceNumberAuto');

  const custom=
    $('#invoiceNumberCustom');

  const fields=
    $('#invoiceNumberCustomFields');

  const input=
    $('#invoiceNumberNext');

  const preview=
    $('#invoiceNumberPreview');


  if(
    !auto ||
    !custom ||
    !fields ||
    !input ||
    !preview
  ){
    return;
  }


  if(custom.checked){

    show(fields);


    const current=
      input.value.trim();

    const next=
      incrementInvoiceSequenceNumber(
        current
      );


    if(current && next){

      preview.innerHTML=
        `<strong>Next invoice:</strong>
         ${esc(current)}
         <span>then ${esc(next)}</span>`;

    }else if(current){

      preview.innerHTML=
        `<strong>Check this format.</strong>
         VendorFlow needs an invoice number containing
         a number it can increment.`;

    }else{

      preview.innerHTML=
        `Example:
         <strong>26-57</strong>
         becomes 26-58, 26-59, and so on.`;
    }


  }else{

    hide(fields);

    preview.innerHTML='';
  }
}


function renderInvoiceNumberingSettings(){

  const auto=
    $('#invoiceNumberAuto');

  const custom=
    $('#invoiceNumberCustom');

  const input=
    $('#invoiceNumberNext');


  if(
    !auto ||
    !custom ||
    !input
  ){
    return;
  }


  const mode=
    String(
      profile.invoiceNumberMode||''
    );


  auto.checked=
    mode==='auto';

  custom.checked=
    mode==='custom';


  input.value=
    profile.invoiceNumberNext||'';


  updateInvoiceNumberingUI();
}


function nextAutomaticInvoiceSequence(){

  const year=
    new Date().getFullYear();


  const used=
    invoices
      .map(
        invoice=>
          String(
            invoice.invoiceNumber||''
          )
      )
      .map(number=>{

        const match=
          number.match(
            new RegExp(
              `^VF-${year}-(\\d+)$`
            )
          );

        return match
          ? Number(match[1])
          : null;
      })
      .filter(
        value=>
          Number.isFinite(value)
      );


  return used.length
    ? Math.max(...used)+1
    : 1;
}


async function reserveNextInvoiceNumber(){

  const ref=
    vendorDoc();


  return await runTransaction(
    db,
    async transaction=>{

      const snap=
        await transaction.get(
          ref
        );

      const data=
        snap.exists()
          ? snap.data()
          : {};


      const mode=
        String(
          data.invoiceNumberMode||''
        );


      if(mode==='custom'){

        const current=
          String(
            data.invoiceNumberNext||''
          ).trim();


        const next=
          incrementInvoiceSequenceNumber(
            current
          );


        if(!current || !next){

          throw new Error(
            'Invoice numbering needs setup.'
          );
        }


        transaction.set(
          ref,
          {
            invoiceNumberNext:
              next,

            invoiceNumberLastUsed:
              current,

            invoiceNumberUpdatedAt:
              serverTimestamp()
          },
          {
            merge:true
          }
        );


        /*
         * Keep in-memory profile aligned so additional
         * invoices created during this same refresh know
         * the newly reserved next number.
         */
        profile.invoiceNumberNext=
          next;

        profile.invoiceNumberLastUsed=
          current;


        return current;
      }


      if(mode==='auto'){

        const year=
          new Date().getFullYear();


        let sequence=
          Number(
            data.invoiceAutoNextNumber
          );


        if(
          !Number.isFinite(sequence) ||
          sequence<1
        ){

          sequence=
            nextAutomaticInvoiceSequence();
        }


        const number=
          `VF-${year}-${String(sequence).padStart(4,'0')}`;


        transaction.set(
          ref,
          {
            invoiceAutoNextNumber:
              sequence+1,

            invoiceNumberLastUsed:
              number,

            invoiceNumberUpdatedAt:
              serverTimestamp()
          },
          {
            merge:true
          }
        );


        profile.invoiceAutoNextNumber=
          sequence+1;

        profile.invoiceNumberLastUsed=
          number;


        return number;
      }


      throw new Error(
        'Choose your invoice numbering before VendorFlow prepares an invoice.'
      );
    }
  );
}


function invoiceStatus(invoice){

  return String(
    invoice?.status||'Ready to Send'
  ).trim();
}


function invoiceCharter(cert){

  if(cert.charterSchoolId){

    const exact=
      charterSchools.find(
        charter=>
          charter.id===cert.charterSchoolId
      );

    if(exact){
      return exact;
    }
  }


  const target=
    normalizedCharterName(
      cert.school
    );


  return charterSchools.find(
    charter=>
      normalizedCharterName(
        charter.name
      )===target
  ) || null;
}


function invoiceStudent(cert){

  if(cert.studentId){

    const exact=
      students.find(
        student=>
          student.id===cert.studentId
      );

    if(exact){
      return exact;
    }
  }


  const target=
    normalizedName(
      cert.student
    );


  return students.find(
    student=>
      normalizedName(
        student.studentName
      )===target
  ) || null;
}


function invoiceService(cert,student){

  const possible=
    services.filter(
      service=>
        service.studentId===student?.id &&
        serviceCountsAsActive(service)
    );


  if(!possible.length){
    return null;
  }


  if(possible.length===1){
    return possible[0];
  }


  const certStart=
    String(
      cert.serviceStartDate||''
    );


  return possible.find(
    service=>
      String(service.startDate||'')===
      certStart
  ) || possible[0];
}


function invoiceNumberForCertificate(cert){

  const year=
    new Date().getFullYear();

  const existingNumbers=
    invoices
      .map(
        invoice=>
          String(invoice.invoiceNumber||'')
      )
      .map(number=>{

        const match=
          number.match(
            /^VF-(\d{4})-(\d+)$/
          );

        if(
          !match ||
          Number(match[1])!==year
        ){
          return null;
        }

        return Number(match[2]);
      })
      .filter(
        number=>
          Number.isFinite(number)
      );


  const next=
    (
      existingNumbers.length
        ? Math.max(...existingNumbers)
        : 0
    )+1;


  return `VF-${year}-${String(next).padStart(4,'0')}`;
}



function invoicePaymentTermsDays(
  value
){

  const raw=
    Number(value);

  if(!Number.isFinite(raw)){
    return 30;
  }

  return Math.max(
    0,
    Math.min(
      365,
      Math.round(raw)
    )
  );
}


function invoicePaymentTermsLabel(
  value
){

  const days=
    invoicePaymentTermsDays(
      value
    );

  return days===0
    ? 'Due upon receipt'
    : `Net ${days}`;
}


function invoiceDueDateForTerms(
  invoiceDate,
  paymentTermsDays
){

  const date=
    parseVendorDate(
      invoiceDate
    );

  if(!date){
    return '';
  }

  const result=
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() +
        invoicePaymentTermsDays(
          paymentTermsDays
        ),
      12,
      0,
      0
    );

  return dateToLocalISO(
    result
  );
}


async function createDueInvoices(){

  const due=
    invoiceReadyCertificates();


  /*
   * Invoice numbering is a one-time vendor choice.
   * Never invent a numbering system for a vendor who
   * may already have invoices outside VendorFlow.
   */
  if(
    due.length &&
    !profile.invoiceNumberMode
  ){
    return 0;
  }

  if(!due.length){
    return 0;
  }


  let created=0;


  for(const cert of due){

    const alreadyExists=
      invoices.some(
        invoice=>
          invoice.certificateId===cert.id
      );


    if(alreadyExists){
      continue;
    }


    const charter=
      invoiceCharter(cert);

    const student=
      invoiceStudent(cert);


    /*
     * VendorFlow never quietly guesses when required billing
     * relationships are missing.
     */
    if(
      !charter ||
      !student
    ){
      continue;
    }


    const service=
      invoiceService(
        cert,
        student
      );


    const vendorAddress=
      vendorAddressParts();


    const invoiceRef=
      doc(
        sub('invoices')
      );


    const invoice={
      invoiceNumber:
        await reserveNextInvoiceNumber(),

      status:
        'Ready to Send',

      certificateId:
        cert.id,

      certificateNumber:
        cert.number||'',

      certificateAmount:
        Number(cert.amount||0),

      serviceAmount:
        Number(
          cert.serviceAmount ||
          Math.max(
            0,
            Number(cert.amount||0) -
            Number(cert.materialsFee||0)
          )
        ),

      materialsFee:
        Math.max(
          0,
          Number(cert.materialsFee||0)
        ),

      amount:
        Number(cert.amount||0),

      studentId:
        student.id,

      studentName:
        student.studentName ||
        cert.student ||
        '',

      parentName:
        student.parentName||'',

      serviceId:
        service?.id||'',

      serviceName:
        cert.serviceDescription ||
        service?.name ||
        service?.serviceName ||
        service?.type ||
        'Educational services',

      serviceStartDate:
        cert.serviceStartDate ||
        service?.startDate ||
        '',

      serviceEndDate:
        cert.serviceEndDate ||
        service?.endDate ||
        '',

      invoiceDate:
        dateToLocalISO(
          new Date()
        ),

      paymentTermsDays:
        invoicePaymentTermsDays(
          charter.paymentTermsDays
        ),

      paymentTermsLabel:
        invoicePaymentTermsLabel(
          charter.paymentTermsDays
        ),

      dueDate:
        invoiceDueDateForTerms(
          dateToLocalISO(
            new Date()
          ),
          charter.paymentTermsDays
        ),

      charterSchoolId:
        charter.id,

      charterSchoolName:
        charter.name||cert.school||'',

      charterAddress:
        charter.address||'',

      charterCity:
        charter.city||'',

      charterState:
        charter.state||'',

      charterZip:
        charter.zip||'',

      charterBillingEmail:
        charter.billingEmail ||
        charter.contactEmail ||
        '',

      vendorBusinessName:
        profile.businessName||'',

      vendorOwnerName:
        profile.ownerName||'',

      vendorStreet:
        vendorAddress.street||'',

      vendorCity:
        vendorAddress.city||'',

      vendorState:
        vendorAddress.state||'',

      vendorZip:
        vendorAddress.zip||'',

      vendorPhone:
        profile.phone||'',

      vendorEmail:
        user?.email||'',

      invoiceReadyDate:
        cert.invoiceReadyDate||'',

      preparedBy:
        'VendorFlow',

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };


    await setDoc(
      invoiceRef,
      invoice
    );


    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'certificates',
        cert.id
      ),
      {
        invoiceId:
          invoiceRef.id,

        invoiceNumber:
          invoice.invoiceNumber,

        status:
          'Invoiced - Ready to Send',

        invoicedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    await log(
      'Invoice prepared',
      `${invoice.invoiceNumber} for ${invoice.studentName} — ${money(invoice.amount)} — ${invoice.charterSchoolName}.`,
      'VendorFlow',
      {
        type:'invoice',
        id:invoiceRef.id
      }
    );


    created++;
  }


  return created;
}


function invoiceAddressLines(invoice){

  const cityLine=
    formattedInvoiceCityLine(
      invoice.charterCity,
      invoice.charterState,
      invoice.charterZip
    );


  return [
    invoice.charterAddress,
    cityLine
  ]
    .filter(Boolean);
}


function vendorInvoiceAddressLines(invoice){

  const cityLine=
    formattedInvoiceCityLine(
      invoice.vendorCity,
      invoice.vendorState,
      invoice.vendorZip
    );


  return [
    invoice.vendorStreet,
    cityLine
  ]
    .filter(Boolean);
}



async function openInvoicePdf(
  invoice
){

  if(!user || !invoice){
    return;
  }


  try{

    const token=
      await user.getIdToken();


    const charter=
      charterSchools.find(
        item=>
          item.id===
          invoice.charterSchoolId
      ) || {};


    const paymentTermsDays=
      invoicePaymentTermsDays(
        invoice.paymentTermsDays ??
        charter.paymentTermsDays
      );


    const dueDate=
      invoice.dueDate ||
      invoiceDueDateForTerms(
        invoice.invoiceDate,
        paymentTermsDays
      );


    const payload={
      invoiceNumber:
        invoice.invoiceNumber||'',

      invoiceDate:
        invoice.invoiceDate||'',

      dueDate:
        dueDate,

      paymentTermsDays:
        paymentTermsDays,

      paymentTermsLabel:
        invoice.paymentTermsLabel ||
        invoicePaymentTermsLabel(
          paymentTermsDays
        ),

      serviceAmount:
        Number(
          invoice.serviceAmount ??
          invoice.amount ??
          0
        ),

      materialsFee:
        Math.max(
          0,
          Number(invoice.materialsFee||0)
        ),

      amount:
        Number(invoice.amount||0),

      studentName:
        invoice.studentName||'',

      serviceName:
        invoice.serviceName||'',

      serviceStartDate:
        invoice.serviceStartDate||'',

      serviceEndDate:
        invoice.serviceEndDate||'',

      certificateNumber:
        invoice.certificateNumber||'',

      charterSchoolName:
        invoice.charterSchoolName ||
        charter.name ||
        '',

      charterAddress:
        invoice.charterAddress ||
        charter.address ||
        '',

      charterCity:
        invoice.charterCity ||
        charter.city ||
        '',

      charterState:
        invoice.charterState ||
        charter.state ||
        '',

      charterZip:
        invoice.charterZip ||
        charter.zip ||
        '',

      charterBillingContact:
        invoice.charterBillingContact ||
        charter.contactName ||
        '',

      charterBillingEmail:
        invoice.charterBillingEmail ||
        charter.billingEmail ||
        charter.contactEmail ||
        '',

      vendorBusinessName:
        invoice.vendorBusinessName||'',

      vendorAddress:
        invoice.vendorStreet||'',

      vendorCity:
        invoice.vendorCity||'',

      vendorState:
        invoice.vendorState||'',

      vendorZip:
        invoice.vendorZip||'',

      vendorPhone:
        invoice.vendorPhone ||
        profile.phone ||
        '',

      vendorEmail:
        invoice.vendorEmail ||
        user?.email ||
        '',

      notes:
        invoice.notes||''
    };


    const response=
      await fetch(
        `${VENDORFLOW_API}/invoice/pdf`,
        {
          method:'POST',

          headers:{
            Authorization:
              `Bearer ${token}`,

            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


    if(!response.ok){

      let data={};

      try{
        data=
          await response.json();
      }catch{}

      throw new Error(
        data.detail ||
        data.error ||
        'Invoice PDF could not be generated.'
      );
    }


    const blob=
      await response.blob();


    const url=
      URL.createObjectURL(
        blob
      );


    const opened=
      window.open(
        url,
        '_blank',
        'noopener'
      );


    if(!opened){

      const link=
        document.createElement(
          'a'
        );

      link.href=
        url;

      link.target=
        '_blank';

      link.rel=
        'noopener';

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();
    }


    setTimeout(
      ()=>URL.revokeObjectURL(url),
      60000
    );


  }catch(error){

    console.error(
      error
    );

    alert(
      error.message ||
      'VendorFlow could not open the invoice PDF.'
    );
  }
}



async function sendInvoiceThroughVendorFlow(
  invoice
){

  if(!user || !invoice){
    return;
  }


  const charter=
    charterSchools.find(
      item=>
        item.id===
        invoice.charterSchoolId
    ) || {};


  const billingEmail=
    String(
      invoice.charterBillingEmail ||
      charter.billingEmail ||
      charter.contactEmail ||
      ''
    ).trim();


  if(!billingEmail){

    alert(
      'No billing email is saved for ' +
      (
        invoice.charterSchoolName ||
        charter.name ||
        'this charter school'
      ) +
      '.'
    );

    return;
  }


  const ok=
    confirm(
      `Send invoice ${invoice.invoiceNumber}?\n\n` +
      `To: ${billingEmail}\n` +
      `Amount: ${money(invoice.amount)}\n\n` +
      `VendorFlow will attach the invoice PDF and send it now.`
    );


  if(!ok){
    return;
  }


  const paymentTermsDays=
    invoicePaymentTermsDays(
      invoice.paymentTermsDays ??
      charter.paymentTermsDays
    );


  const payload={

    invoiceId:
      invoice.id,

    invoiceNumber:
      invoice.invoiceNumber||'',

    invoiceDate:
      invoice.invoiceDate||'',

    serviceAmount:
      Number(
        invoice.serviceAmount ??
        invoice.amount ??
        0
      ),

    materialsFee:
      Math.max(
        0,
        Number(invoice.materialsFee||0)
      ),

    amount:
      Number(invoice.amount||0),

    paymentTermsDays,

    paymentTermsLabel:
      invoice.paymentTermsLabel ||
      invoicePaymentTermsLabel(
        paymentTermsDays
      ),

    studentName:
      invoice.studentName||'',

    serviceName:
      invoice.serviceName||'',

    serviceStartDate:
      invoice.serviceStartDate||'',

    serviceEndDate:
      invoice.serviceEndDate||'',

    certificateNumber:
      invoice.certificateNumber||'',

    charterSchoolName:
      invoice.charterSchoolName ||
      charter.name ||
      '',

    charterAddress:
      invoice.charterAddress ||
      charter.address ||
      '',

    charterCity:
      invoice.charterCity ||
      charter.city ||
      '',

    charterState:
      invoice.charterState ||
      charter.state ||
      '',

    charterZip:
      invoice.charterZip ||
      charter.zip ||
      '',

    charterBillingContact:
      invoice.charterBillingContact ||
      charter.contactName ||
      '',

    charterBillingEmail:
      billingEmail,

    vendorBusinessName:
      invoice.vendorBusinessName ||
      profile.businessName ||
      '',

    vendorOwnerName:
      invoice.vendorOwnerName ||
      profile.ownerName ||
      '',

    vendorAddress:
      invoice.vendorStreet ||
      profile.address ||
      '',

    vendorCity:
      invoice.vendorCity ||
      profile.city ||
      '',

    vendorState:
      invoice.vendorState ||
      profile.state ||
      '',

    vendorZip:
      invoice.vendorZip ||
      profile.zip ||
      '',

    vendorPhone:
      invoice.vendorPhone ||
      profile.phone ||
      '',

    vendorEmail:
      invoice.vendorEmail ||
      user?.email ||
      '',

    notes:
      invoice.notes||''
  };


  const token=
    await user.getIdToken();


  const response=
    await fetch(
      `${VENDORFLOW_API}/invoice/send`,
      {
        method:'POST',

        headers:{
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );


  let data={};


  try{

    data=
      await response.json();

  }catch{}


  if(!response.ok){

    throw new Error(
      data.detail ||
      data.error ||
      'VendorFlow could not send this invoice.'
    );
  }


  /*
   * IMPORTANT:
   * Only mark Sent AFTER the server confirms
   * that the email service accepted the message.
   */
  await setDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'invoices',
      invoice.id
    ),
    {
      status:
        'Sent',

      sentAt:
        serverTimestamp(),

      sentTo:
        billingEmail,

      emailProvider:
        'Resend',

      emailProviderId:
        data.emailId || '',

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  await log(
    'Invoice sent',
    `${invoice.invoiceNumber} — ${invoice.charterSchoolName} — ${money(invoice.amount)} — sent to ${billingEmail}.`,
    'VendorFlow',
    {
      type:'invoice',
      id:invoice.id
    }
  );


  await refreshAll();


  alert(
    `Invoice ${invoice.invoiceNumber} was sent successfully to ${billingEmail}.`
  );
}



function invoiceLedgerDate(value){

  const raw=
    String(value||'').trim();

  if(!raw){
    return '';
  }

  const date=
    parseVendorDate(raw);

  if(!date){
    return raw;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month:'short',
      day:'numeric',
      year:'numeric'
    }
  );
}


function invoiceLedgerSearchText(invoice){

  return [
    invoice.invoiceNumber,
    invoice.charterSchoolName,
    invoice.studentName,
    invoice.serviceName,
    invoice.invoiceDate,
    invoice.serviceStartDate,
    invoice.serviceEndDate,
    invoice.certificateNumber,
    invoice.amount,
    money(invoice.amount),
    invoiceStatus(invoice)
  ]
    .map(
      value=>
        String(value??'')
          .toLowerCase()
    )
    .join(' ');
}


function invoiceLedgerMatchesFilters(invoice){

  const f=
    invoiceAdvancedFilters;


  if(
    f.charter &&
    String(invoice.charterSchoolName||'')!==f.charter
  ){
    return false;
  }


  if(
    f.student &&
    String(invoice.studentName||'')!==f.student
  ){
    return false;
  }


  if(
    f.service &&
    String(invoice.serviceName||'')!==f.service
  ){
    return false;
  }


  const invoiceDate=
    String(invoice.invoiceDate||'')
      .slice(0,10);


  if(
    f.dateFrom &&
    invoiceDate &&
    invoiceDate<f.dateFrom
  ){
    return false;
  }


  if(
    f.dateTo &&
    invoiceDate &&
    invoiceDate>f.dateTo
  ){
    return false;
  }


  const amount=
    Number(invoice.amount||0);


  if(
    f.amountMin!=='' &&
    amount<Number(f.amountMin)
  ){
    return false;
  }


  if(
    f.amountMax!=='' &&
    amount>Number(f.amountMax)
  ){
    return false;
  }


  return true;
}


function invoiceLedgerStatusClass(status){

  const value=
    String(status||'')
      .toLowerCase();

  if(value==='paid'){
    return 'paid';
  }

  if(value==='sent'){
    return 'sent';
  }

  return 'ready';
}


function invoiceLedgerFiltersActive(){

  return (
    invoiceStatusFilter!=='all' ||
    Boolean(invoiceSearchQuery) ||
    Object.values(
      invoiceAdvancedFilters
    ).some(
      value=>
        String(value)!==''
    )
  );
}


function populateInvoiceLedgerFilters(){

  const configs=[
    {
      selector:'#invoiceFilterCharter',
      key:'charterSchoolName',
      current:invoiceAdvancedFilters.charter,
      label:'All charters'
    },
    {
      selector:'#invoiceFilterStudent',
      key:'studentName',
      current:invoiceAdvancedFilters.student,
      label:'All students'
    },
    {
      selector:'#invoiceFilterService',
      key:'serviceName',
      current:invoiceAdvancedFilters.service,
      label:'All services'
    }
  ];


  configs.forEach(config=>{

    const select=
      $(config.selector);

    if(!select){
      return;
    }


    const values=
      [...new Set(
        invoices
          .map(
            invoice=>
              String(
                invoice[config.key]||''
              ).trim()
          )
          .filter(Boolean)
      )]
        .sort(
          (a,b)=>
            a.localeCompare(b)
        );


    select.innerHTML=
      `<option value="">${config.label}</option>`+
      values
        .map(
          value=>
            `<option value="${esc(value)}">${esc(value)}</option>`
        )
        .join('');


    select.value=
      config.current;
  });
}


function installInvoiceNumberingPopup(){

  const settings=
    $('#invoiceNumberingSettings');

  const body=
    $('#invoiceNumberingModalBody');

  const open=
    $('#openInvoiceNumberingSettings');

  const modal=
    $('#invoiceNumberingModal');

  const close=
    $('#closeInvoiceNumbering');


  if(
    !settings ||
    !body ||
    !open ||
    !modal
  ){
    return;
  }


  if(settings.parentElement!==body){

    const oldParent=
      settings.parentElement;

    body.appendChild(settings);

    settings.classList.remove(
      'hidden'
    );


    if(
      oldParent &&
      !oldParent.textContent.trim()
    ){
      oldParent.style.display='none';
    }
  }


  open.onclick=()=>{

    show(modal);

    renderInvoiceNumberingSettings();
  };


  const closeModal=()=>{

    hide(modal);
  };


  if(close){
    close.onclick=
      closeModal;
  }


  modal.onclick=
    event=>{

      if(event.target===modal){
        closeModal();
      }
    };
}



/*
 * History can open invoice evidence from any VendorFlow page.
 * Keep the shared invoice modal outside hidden .view containers.
 */
function moveInvoiceDetailModalToRoot(){

  const modal=
    $('#invoiceDetailModal');


  if(
    !modal ||
    modal.parentElement===document.body
  ){
    return;
  }


  document.body.appendChild(
    modal
  );
}


moveInvoiceDetailModalToRoot();


function closeInvoiceLedgerDetail(){

  const modal=
    $('#invoiceDetailModal');

  if(modal){
    hide(modal);
  }
}


async function markInvoiceSentManually(invoice){

  const ok=
    confirm(
      `Mark ${invoice.invoiceNumber} as sent?\n\n`+
      `This records that the invoice was sent to ${invoice.charterSchoolName}.`
    );

  if(!ok){
    return;
  }


  await setDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'invoices',
      invoice.id
    ),
    {
      status:'Sent',
      sentAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },
    {
      merge:true
    }
  );


  await log(
    'Invoice marked sent',
    `${invoice.invoiceNumber} — ${invoice.charterSchoolName} — ${money(invoice.amount)}.`,
    'Manual',
    {
      type:'invoice',
      id:invoice.id
    }
  );


  closeInvoiceLedgerDetail();

  await refreshAll();
}


async function markInvoicePaidManually(invoice){

  const ok=
    confirm(
      `Mark ${invoice.invoiceNumber} as paid?`
    );

  if(!ok){
    return;
  }


  await setDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'invoices',
      invoice.id
    ),
    {
      status:'Paid',
      paidAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },
    {
      merge:true
    }
  );


  await log(
    'Invoice marked paid',
    `${invoice.invoiceNumber} — ${invoice.charterSchoolName} — ${money(invoice.amount)}.`,
    'Manual',
    {
      type:'invoice',
      id:invoice.id
    }
  );


  closeInvoiceLedgerDetail();

  await refreshAll();
}


function showInvoiceLedgerDetail(invoice){

  const modal=
    $('#invoiceDetailModal');

  const content=
    $('#invoiceDetailContent');


  if(
    !modal ||
    !content
  ){
    return;
  }


  const status=
    invoiceStatus(invoice);


  content.innerHTML=`
    <div class="vf-invoice-detail-heading">

      <div>
        <div class="eyebrow">
          Invoice
        </div>

        <h2>
          ${esc(invoice.invoiceNumber||'Invoice')}
        </h2>
      </div>

      <span class="vf-ledger-status ${invoiceLedgerStatusClass(status)}">
        ${esc(status.toUpperCase())}
      </span>

    </div>


    <div class="vf-invoice-detail-grid">

      <div>
        <small>Charter school</small>
        <strong>${esc(invoice.charterSchoolName||'—')}</strong>
      </div>

      <div>
        <small>Student</small>
        <strong>${esc(invoice.studentName||'—')}</strong>
      </div>

      <div>
        <small>Service</small>
        <strong>${esc(invoice.serviceName||'Educational services')}</strong>
      </div>

      <div>
        <small>Invoice date</small>
        <strong>${esc(invoiceLedgerDate(invoice.invoiceDate)||'—')}</strong>
      </div>

      <div>
        <small>Certificate / PO</small>
        <strong>${esc(invoice.certificateNumber||'—')}</strong>
      </div>

      <div>
        <small>Service amount</small>
        <strong>
          ${money(
            invoice.serviceAmount ??
            invoice.amount
          )}
        </strong>
      </div>

      ${
        Number(invoice.materialsFee||0)>0
          ? `
            <div>
              <small>Materials fee</small>
              <strong>
                ${money(invoice.materialsFee)}
              </strong>
            </div>
          `
          : ''
      }

      <div>
        <small>Total</small>
        <strong>${money(invoice.amount)}</strong>
      </div>

    </div>


    <div class="vf-invoice-detail-actions">

      <button
        type="button"
        id="ledgerViewPdf"
        class="vf-secondary-button">
        View PDF
      </button>

      ${
        status==='Ready to Send'
          ? `
            <button
              type="button"
              id="ledgerSendInvoice"
              class="primary">
              Send Invoice
            </button>

            <button
              type="button"
              id="ledgerMarkSent"
              class="vf-secondary-button">
              Mark sent outside VendorFlow
            </button>
          `
          : ''
      }

      ${
        status==='Sent'
          ? `
            <button
              type="button"
              id="ledgerMarkPaid"
              class="primary">
              Mark Paid
            </button>
          `
          : ''
      }

    </div>
  `;


  $('#ledgerViewPdf').onclick=()=>{

    openInvoicePdf(invoice);
  };


  const send=
    $('#ledgerSendInvoice');

  if(send){

    send.onclick=
      async()=>{

        const original=
          send.textContent;

        try{

          send.disabled=true;
          send.textContent='Sending...';

          await sendInvoiceThroughVendorFlow(
            invoice
          );

          closeInvoiceLedgerDetail();

        }catch(error){

          console.error(error);

          alert(
            error.message ||
            'VendorFlow could not send this invoice.'
          );

        }finally{

          send.disabled=false;
          send.textContent=original;
        }
      };
  }


  const markSent=
    $('#ledgerMarkSent');

  if(markSent){

    markSent.onclick=
      ()=>markInvoiceSentManually(
        invoice
      );
  }


  const markPaid=
    $('#ledgerMarkPaid');

  if(markPaid){

    markPaid.onclick=
      ()=>markInvoicePaidManually(
        invoice
      );
  }


  show(modal);
}


function renderInvoices(){

  renderInvoiceNumberingSettings();

  installInvoiceNumberingPopup();

  populateInvoiceLedgerFilters();


  const list=
    $('#invoiceList');

  if(!list){
    return;
  }


  const ready=
    invoices.filter(
      invoice=>
        invoiceStatus(invoice)==='Ready to Send'
    );

  const sent=
    invoices.filter(
      invoice=>
        invoiceStatus(invoice)==='Sent'
    );

  const paid=
    invoices.filter(
      invoice=>
        invoiceStatus(invoice)==='Paid'
    );


  if($('#invoiceAllCount')){
    $('#invoiceAllCount').textContent=
      `(${invoices.length})`;
  }

  if($('#invoiceReadyCount')){
    $('#invoiceReadyCount').textContent=
      `(${ready.length})`;
  }

  if($('#invoiceSentCount')){
    $('#invoiceSentCount').textContent=
      `(${sent.length})`;
  }

  if($('#invoicePaidCount')){
    $('#invoicePaidCount').textContent=
      `(${paid.length})`;
  }


  $$('[data-invoice-filter]')
    .forEach(button=>{

      button.classList.toggle(
        'active',
        button.dataset.invoiceFilter===
          invoiceStatusFilter
      );


      button.onclick=()=>{

        invoiceStatusFilter=
          button.dataset.invoiceFilter;

        renderInvoices();
      };
    });


  const search=
    $('#invoiceSearch');


  if(search){

    search.value=
      invoiceSearchQuery;


    search.oninput=()=>{

      invoiceSearchQuery=
        search.value
          .trim()
          .toLowerCase();

      renderInvoices();
    };
  }


  const toggle=
    $('#toggleInvoiceFilters');


  if(toggle){

    toggle.onclick=()=>{

      $('#invoiceAdvancedFilters')
        ?.classList.toggle(
          'hidden'
        );
    };
  }


  const fields=[
    ['#invoiceFilterCharter','charter'],
    ['#invoiceFilterStudent','student'],
    ['#invoiceFilterService','service'],
    ['#invoiceFilterDateFrom','dateFrom'],
    ['#invoiceFilterDateTo','dateTo'],
    ['#invoiceFilterAmountMin','amountMin'],
    ['#invoiceFilterAmountMax','amountMax']
  ];


  fields.forEach(
    ([selector,key])=>{

      const el=
        $(selector);

      if(!el){
        return;
      }


      el.value=
        invoiceAdvancedFilters[key]||'';


      const update=()=>{

        invoiceAdvancedFilters[key]=
          el.value;

        renderInvoices();
      };


      el.onchange=
        update;


      if(el.type==='number'){
        el.oninput=
          update;
      }
    }
  );


  const clear=
    $('#clearInvoiceFilters');


  if(clear){

    clear.classList.remove(
      'hidden'
    );


    clear.disabled=
      !invoiceLedgerFiltersActive();


    clear.onclick=()=>{

      invoiceStatusFilter='all';

      invoiceSearchQuery='';

      invoiceAdvancedFilters={
        charter:'',
        student:'',
        service:'',
        dateFrom:'',
        dateTo:'',
        amountMin:'',
        amountMax:''
      };

      renderInvoices();
    };
  }


  let visible=
    [...invoices];


  if(invoiceStatusFilter==='ready'){
    visible=ready;
  }

  if(invoiceStatusFilter==='sent'){
    visible=sent;
  }

  if(invoiceStatusFilter==='paid'){
    visible=paid;
  }


  if(invoiceSearchQuery){

    visible=
      visible.filter(
        invoice=>
          invoiceLedgerSearchText(
            invoice
          ).includes(
            invoiceSearchQuery
          )
      );
  }


  visible=
    visible.filter(
      invoiceLedgerMatchesFilters
    );


  visible.sort(
    (a,b)=>
      String(
        b.invoiceDate||''
      ).localeCompare(
        String(a.invoiceDate||'')
      )
  );


  if(!visible.length){

    list.innerHTML=
      '<div class="vf-invoice-ledger-empty">No invoices match these filters.</div>';

    return;
  }


  list.innerHTML=`
    <div class="vf-invoice-ledger-header">

      <span>Invoice</span>
      <span>Charter</span>
      <span>Student</span>
      <span>Service</span>
      <span>Date</span>
      <span class="right">Amount</span>
      <span>Status</span>

    </div>

    ${visible.map(invoice=>{

      const status=
        invoiceStatus(invoice);

      return `
        <button
          type="button"
          class="vf-invoice-ledger-row"
          data-ledger-invoice="${invoice.id}">

          <span class="vf-ledger-number">
            ${esc(invoice.invoiceNumber||'Invoice')}
          </span>

          <span>
            ${esc(invoice.charterSchoolName||'—')}
          </span>

          <span>
            ${esc(invoice.studentName||'—')}
          </span>

          <span>
            ${esc(invoice.serviceName||'Educational services')}
          </span>

          <span>
            ${esc(invoiceLedgerDate(invoice.invoiceDate)||'—')}
          </span>

          <span class="right">
            ${money(invoice.amount)}
          </span>

          <span>
            <span class="vf-ledger-status ${invoiceLedgerStatusClass(status)}">
              ${esc(status.toUpperCase())}
            </span>
          </span>

        </button>
      `;
    }).join('')}
  `;


  $$('[data-ledger-invoice]')
    .forEach(row=>{

      row.onclick=()=>{

        const invoice=
          invoices.find(
            item=>
              item.id===
              row.dataset.ledgerInvoice
          );

        if(invoice){

          showInvoiceLedgerDetail(
            invoice
          );
        }
      };
    });


  const close=
    $('#closeInvoiceDetail');

  if(close){

    close.onclick=
      closeInvoiceLedgerDetail;
  }


  const modal=
    $('#invoiceDetailModal');

  if(modal){

    modal.onclick=
      event=>{

        if(event.target===modal){
          closeInvoiceLedgerDetail();
        }
      };
  }
}


function renderCertificateCharterOptions(){

  const list=
    $('#certCharterSchoolOptions');

  if(!list){
    return;
  }

  list.innerHTML=
    charterSchools
      .filter(
        charter=>!charter.archived
      )
      .sort(
        (a,b)=>
          String(a.name||'')
            .localeCompare(
              String(b.name||'')
            )
      )
      .map(
        charter=>
          `<option value="${esc(charter.name||'')}"></option>`
      )
      .join('');
}



function wireDashboardStatCards(){

  const cards=[
    {
      value:'#statClasses',
      view:'classes',
      title:'Open Class Rosters'
    },
    {
      value:'#statStudents',
      view:'students',
      title:'Open Students & Services'
    },
    {
      value:'#statReview',
      view:'review',
      title:'Open Needs Review'
    },
    {
      value:'#statHistory',
      view:'history',
      title:'Open VendorFlow Actions'
    }
  ];


  cards.forEach(item=>{

    const value=
      $(item.value);

    if(!value){
      return;
    }


    const card=
      value.closest('.stat');

    if(!card){
      return;
    }


    card.classList.add(
      'vf-clickable-stat'
    );

    card.setAttribute(
      'role',
      'button'
    );

    card.setAttribute(
      'tabindex',
      '0'
    );

    card.setAttribute(
      'title',
      item.title
    );


    const activate=()=>{

      switchView(
        item.view
      );
    };


    card.onclick=
      activate;


    card.onkeydown=
      event=>{

        if(
          event.key==='Enter' ||
          event.key===' '
        ){

          event.preventDefault();

          activate();
        }
      };
  });
}


function renderDashboard(){

  wireDashboardStatCards();

  const activeClasses=
    classes.filter(
      c=>!c.archived
    );

  const readyInvoices=
    invoices.filter(
      invoice=>
        invoiceStatus(invoice)==='Ready to Send'
    );


  const invoicesWaitingForNumbering=
    !profile.invoiceNumberMode
      ? invoiceReadyCertificates()
      : [];


  const needsReviewItems=
    allNeedsReviewItems();


  $('#statClasses').textContent=
    activeClasses.length;


  $('#statStudents').textContent=
    students.filter(
      studentVisibleInServices
    ).length;


  $('#statReview').textContent=
    needsReviewItems.length;


  $('#statHistory').textContent=
    history.length;


  $('#reviewBadge').textContent=
    needsReviewItems.length;


  const count=
    $('#dashboardAttentionCount');

  const title=
    $('#dashboardAttentionTitle');

  const text=
    $('#dashboardAttentionText');

  const reviewButton=
    $('#dashboardAttentionButton');

  const setupButton=
    $('#dashboardSetupButton');

  const tutorialButton=
    $('#dashboardTutorialButton');



  /*
   * --------------------------------------------------------
   * INVOICE NUMBERING SETUP
   *
   * A certificate has reached its billing date, but the
   * vendor has not yet told VendorFlow how invoices should
   * be numbered.
   * --------------------------------------------------------
   */

  if(invoicesWaitingForNumbering.length){

    hide(
      setupButton
    );

    hide(
      tutorialButton
    );


    count.textContent=
      invoicesWaitingForNumbering.length;


    title.textContent=
      'Set your invoice numbering.';


    text.textContent=
      `${invoicesWaitingForNumbering.length} certificate${
        invoicesWaitingForNumbering.length===1?' has':'s have'
      } reached the billing date. Tell VendorFlow whether to continue your existing invoice sequence or create numbers automatically.`;


    show(
      reviewButton
    );


    reviewButton.textContent=
      'Set invoice numbering';


    reviewButton.onclick=()=>{

      switchView(
        'invoices'
      );

      renderInvoiceNumberingSettings();

      $('#invoiceNumberingSettings')
        ?.scrollIntoView({
          behavior:'smooth',
          block:'start'
        });
    };


    renderHistoryInto(
      $('#recentHistory'),
      history.slice(0,6)
    );


    return;
  }


  /*
   * --------------------------------------------------------
   * BRAND-NEW VENDOR
   *
   * Before there is anything operational to review,
   * use this space to guide the vendor to the next best step.
   * --------------------------------------------------------
   */

  /*
   * Setup guidance is only appropriate when there is
   * truly nothing operational that needs attention.
   *
   * Financial/review work always outranks onboarding.
   */
  if(
    !activeClasses.length &&
    !readyInvoices.length &&
    !invoicesWaitingForNumbering.length &&
    !needsReviewItems.length
  ){

    count.textContent='1';


    title.textContent=
      'Welcome to VendorFlow.';


    text.textContent=
      'Start by setting up your first class. Go to Class Rosters to create the class and add or upload the roster.';


    hide(
      reviewButton
    );


    show(
      setupButton
    );


    show(
      tutorialButton
    );


    setupButton.onclick=()=>{

      switchView(
        'classes'
      );
    };


    tutorialButton.onclick=()=>{

      toast(
        'VendorFlow tutorial coming soon.'
      );
    };


    renderHistoryInto(
      $('#recentHistory'),
      history.slice(0,6)
    );


    return;
  }


  /*
   * --------------------------------------------------------
   * NORMAL OPERATION
   * --------------------------------------------------------
   */

  hide(
    setupButton
  );


  hide(
    tutorialButton
  );


  const attentionTotal=
    readyInvoices.length +
    needsReviewItems.length;

  count.textContent=
    attentionTotal;


  if(readyInvoices.length){

    const charterCount=
      new Set(
        readyInvoices.map(
          cert=>
            cert.charterSchoolId ||
            normalizedCharterName(
              cert.charterSchoolName
            )
        )
      ).size;


    title.textContent=
      `${readyInvoices.length} invoice${
        readyInvoices.length===1?' is':'s are'
      } ready to send.`;


    text.textContent=
      `VendorFlow prepared ${
        readyInvoices.length
      } invoice${
        readyInvoices.length===1?'':'s'
      } across ${
        charterCount
      } charter school${
        charterCount===1?'':'s'
      }. Review the finished invoice${
        readyInvoices.length===1?'':'s'
      } and send when ready.`;


    show(
      reviewButton
    );


    reviewButton.textContent=
      'View invoices';


    reviewButton.onclick=()=>{

      switchView(
        'invoices'
      );
    };


  }else if(needsReviewItems.length){

    title.textContent=
      `${needsReviewItems.length} item${needsReviewItems.length===1?'':'s'} need your attention.`;


    text.textContent=
      'VendorFlow has held these items for you instead of making a questionable decision.';


    show(
      reviewButton
    );


    reviewButton.textContent=
      'Review items';


    reviewButton.onclick=()=>{

      switchView(
        'review'
      );
    };


  }else{

    title.textContent=
      `You're all caught up.`;


    text.textContent=
      'VendorFlow has nothing urgent flagged right now.';


    hide(
      reviewButton
    );
  }


  renderHistoryInto(
    $('#recentHistory'),
    history.slice(0,6)
  );
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



let editingClassId='';


function classDateLabel(value){

  const text=
    String(value||'').trim();

  if(!text){
    return '';
  }

  const parts=
    text.split('-')
      .map(Number);

  if(parts.length!==3){
    return text;
  }

  const [year,month,day]=parts;

  const date=
    new Date(
      year,
      month-1,
      day,
      12,0,0,0
    );

  if(Number.isNaN(date.getTime())){
    return text;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:'short',
      day:'numeric',
      year:'numeric'
    }
  );
}


function addCalendarDays(
  isoDate,
  days
){

  const parts=
    String(isoDate||'')
      .split('-')
      .map(Number);

  if(parts.length!==3){
    return '';
  }

  const [year,month,day]=parts;

  const date=
    new Date(
      year,
      month-1,
      day,
      12,0,0,0
    );

  if(Number.isNaN(date.getTime())){
    return '';
  }

  date.setDate(
    date.getDate()+
    Number(days||0)
  );

  const y=date.getFullYear();

  const m=
    String(date.getMonth()+1)
      .padStart(2,'0');

  const d=
    String(date.getDate())
      .padStart(2,'0');

  return `${y}-${m}-${d}`;
}


/*
 * Grace-day rule:
 *
 * Due Jan 1 + 3 grace days means:
 * Jan 2, Jan 3 and Jan 4 are grace days.
 * Late fee is added Jan 5.
 */
function classLateFeeDate(
  dueDate,
  graceDays
){

  return addCalendarDays(
    dueDate,
    Number(graceDays||0)+1
  );
}


function automaticLateFeeReminderText(
  classRecord,
  dueDate
){

  const lateFee=
    Number(classRecord?.lateFee||0);

  if(
    !(lateFee>0) ||
    !dueDate
  ){
    return '';
  }

  const feeDate=
    classLateFeeDate(
      dueDate,
      classRecord.lateFeeGraceDays
    );

  if(!feeDate){
    return '';
  }

  return (
    `If payment has not been received by the end of `+
    `${classDateLabel(addCalendarDays(feeDate,-1))}, `+
    `a ${money(lateFee)} late fee will be added on `+
    `${classDateLabel(feeDate)}.`
  );
}


function firstClassPaymentDueDate(
  classRecord
){

  if(!classRecord){
    return '';
  }

  if(
    classRecord.paymentSchedule==='Full'
  ){
    return classRecord.paymentDueDate||'';
  }

  if(
    classRecord.paymentSchedule==='Monthly'
  ){

    const installments=
      Array.isArray(
        classRecord.monthlyInstallments
      )
        ? classRecord.monthlyInstallments
        : [];

    return installments
      .filter(item=>item?.dueDate)
      .sort(
        (a,b)=>
          String(a.dueDate)
            .localeCompare(
              String(b.dueDate)
            )
      )[0]?.dueDate ||
      classRecord.monthlyFirstDueDate ||
      '';
  }


  if(
    classRecord.paymentSchedule==='Custom'
  ){

    const installments=
      Array.isArray(
        classRecord.customInstallments
      )
        ? classRecord.customInstallments
        : [];

    return installments
      .filter(item=>item?.dueDate)
      .sort(
        (a,b)=>
          String(a.dueDate)
            .localeCompare(
              String(b.dueDate)
            )
      )[0]?.dueDate || '';
  }

  return '';
}


function classPaymentScheduleHTML(
  classRecord
){

  const schedule=
    classRecord?.paymentSchedule ||
    'Full';

  if(schedule==='Custom'){

    const installments=
      Array.isArray(
        classRecord.customInstallments
      )
        ? [...classRecord.customInstallments]
        : [];

    if(!installments.length){
      return '<span>No installments saved.</span>';
    }

    return `
      <div class="vf-saved-installments">
        ${installments
          .sort(
            (a,b)=>
              String(a.dueDate||'')
                .localeCompare(
                  String(b.dueDate||'')
                )
          )
          .map(
            (item,index)=>`
              <div>
                <span>
                  Payment ${index+1}
                </span>

                <strong>
                  ${money(item.amount)}
                </strong>

                <span>
                  ${esc(
                    classDateLabel(
                      item.dueDate
                    )
                  )}
                </span>
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  if(schedule==='Monthly'){

    const installments=
      Array.isArray(
        classRecord.monthlyInstallments
      )
        ? [...classRecord.monthlyInstallments]
        : [];


    if(!installments.length){

      return `
        <span>
          Monthly payment schedule not yet set.
        </span>
      `;
    }


    return `
      <div class="vf-saved-installments">

        ${installments
          .sort(
            (a,b)=>
              String(a.dueDate||'')
                .localeCompare(
                  String(b.dueDate||'')
                )
          )
          .map(
            (item,index)=>`
              <div>

                <span>
                  Payment ${index+1}
                </span>

                <strong>
                  ${money(item.amount)}
                </strong>

                <span>
                  ${esc(
                    classDateLabel(
                      item.dueDate
                    )
                  )}
                </span>

              </div>
            `
          )
          .join('')}

      </div>
    `;
  }

  return `
    <span>
      Pay in full
      ${
        classRecord.paymentDueDate
          ? ' · due '+
            esc(
              classDateLabel(
                classRecord.paymentDueDate
              )
            )
          : ''
      }
    </span>
  `;
}


function renderSelectedClassDetails(){

  const box=
    $('#classDetailsCard');

  if(!box){
    return;
  }

  const c=
    currentClass();

  if(!c){

    box.innerHTML='';
    hide(box);
    return;
  }


  const dueDate=
    firstClassPaymentDueDate(c);

  const automaticLateText=
    automaticLateFeeReminderText(
      c,
      dueDate
    );


  box.innerHTML=`

    <div class="vf-class-details-head">

      <div>
        <div class="eyebrow">
          Class details
        </div>

        <h3>
          ${esc(c.name||'Unnamed class')}
        </h3>

        <div class="vf-class-details-sub">
          ${c.term?esc(c.term):''}
          ${
            c.location
              ? `${c.term?' · ':''}${esc(c.location)}`
              : ''
          }
        </div>
      </div>

      <button
        type="button"
        class="primary"
        id="editSelectedClass">
        Edit class
      </button>

    </div>


    ${
      c.classType==='Tutoring'
        ? `
          <div class="vf-tutoring-class-summary">

            <div>
              <small>Class type</small>
              <strong>Tutoring</strong>
            </div>

            <div>
              <small>Normal session</small>
              <strong>
                ${Number(c.sessionLengthMinutes||60)} minutes
              </strong>
            </div>

            <div>
              <small>Rate per session</small>
              <strong>
                ${money(c.ratePerSession||0)}
              </strong>
            </div>

            <div>
              <small>Accounting</small>
              <strong>
                Charges tracked in dollars
              </strong>
            </div>

          </div>
        `
        : ''
    }


    <div class="vf-class-detail-grid">

      <div>
        <small>Tuition</small>
        <strong>
          ${money(c.tuition)}
        </strong>
      </div>

      <div>
        <small>Payment plan</small>
        <strong>
          ${esc(c.paymentSchedule||'Full')}
        </strong>
      </div>

      <div>
        <small>Late fee</small>
        <strong>
          ${
            Number(c.lateFee||0)>0
              ? money(c.lateFee)
              : 'None'
          }
        </strong>
      </div>

      <div>
        <small>Grace period</small>
        <strong>
          ${Number(c.lateFeeGraceDays||0)}
          day${Number(c.lateFeeGraceDays||0)===1?'':'s'}
        </strong>
      </div>

      <div>
        <small>Vendor alert</small>
        <strong>
          ${Number(c.vendorAlertDays||0)}
          day${Number(c.vendorAlertDays||0)===1?'':'s'}
          before due
        </strong>
      </div>

      <div>
        <small>Parent reminders</small>
        <strong>
          ${
            c.parentReminderEnabled
              ? `${Number(c.parentReminderDays||0)} days before due`
              : 'Off'
          }
        </strong>
      </div>

    </div>


    <div class="vf-class-payment-summary">

      <strong>Payment schedule</strong>

      ${classPaymentScheduleHTML(c)}

    </div>


    ${
      Number(c.lateFee||0)>0
        ? `
          <div class="vf-auto-late-notice">
            <strong>
              Automatic parent-reminder language
            </strong>

            ${
              automaticLateText
                ? `<span>${esc(automaticLateText)}</span>`
                : `
                  <span>
                    VendorFlow will automatically include the late-fee
                    amount and application date when a specific payment
                    due date is available.
                  </span>
                `
            }
          </div>
        `
        : ''
    }


    ${
      c.parentReminderEnabled
        ? `
          <details class="vf-saved-reminder">
            <summary>
              View parent reminder settings
            </summary>

            <div>
              <strong>Subject</strong>
              <span>
                ${esc(c.reminderSubject||'')}
              </span>
            </div>

            <div>
              <strong>Custom message</strong>
              <span class="vf-reminder-message">
                ${esc(c.reminderBody||'')}
              </span>
            </div>

            ${
              Number(c.lateFee||0)>0
                ? `
                  <p>
                    The late-fee notice above is added automatically;
                    it does not need to be typed into this custom message.
                  </p>
                `
                : ''
            }

          </details>
        `
        : ''
    }

  `;


  show(box);


  $('#editSelectedClass')
    .onclick=()=>{

      editSavedClass(
        c.id
      );
    };
}


function editSavedClass(
  classId
){

  const c=
    classes.find(
      item=>item.id===classId
    );

  if(!c){
    return toast(
      'Class could not be found.'
    );
  }


  editingClassId=
    c.id;

  clearClassSaveError();


  $('#className').value=
    c.name||'';


  if($('#classType')){

    $('#classType').value=
      c.classType==='Tutoring'
        ? 'Tutoring'
        : 'Class';
  }


  if($('#classSessionLength')){

    $('#classSessionLength').value=
      Number(c.sessionLengthMinutes||60);
  }


  if($('#classSessionRate')){

    $('#classSessionRate').value=
      Number(c.ratePerSession||0) || '';
  }


  if($('#classInvoiceDaysAfterStart')){

    $('#classInvoiceDaysAfterStart').value=
      Number.isFinite(
        Number(c.invoiceDaysAfterStart)
      )
        ? Number(c.invoiceDaysAfterStart)
        : 14;
  }


  $('#classTerm').value=
    c.term||'';

  $('#classTuition').value=
    Number(c.tuition||0) || '';

  $('#classLocation').value=
    c.location||'';

  $('#classPaymentSchedule').value=
    c.paymentSchedule||'Full';

  $('#classPaymentDueDate').value=
    c.paymentDueDate||'';

  $('#classMonthlyFirstDueDate').value=
    c.monthlyFirstDueDate || '';

  $('#classMonthlyPaymentCount').value=
    Number(c.monthlyPaymentCount||4);

  $('#classLateFee').value=
    Number(c.lateFee||0);

  $('#classLateFeeGraceDays').value=
    Number(c.lateFeeGraceDays||0);

  $('#classVendorAlertDays').value=
    Number(c.vendorAlertDays||0);

  $('#classParentReminderEnabled').checked=
    Boolean(c.parentReminderEnabled);

  $('#classParentReminderDays').value=
    Number(c.parentReminderDays||0);

  $('#classReminderSubject').value=
    c.reminderSubject ||
    'Payment reminder for {{studentName}}';

  $('#classReminderBody').value=
    c.reminderBody ||
`Hi {{parentName}},

This is a reminder that {{amountDue}} is due on {{dueDate}} for {{studentName}} — {{serviceName}}.

Payment instructions:
{{paymentInstructions}}

Thank you,
{{businessName}}`;


  const monthlyList=
    $('#classMonthlyInstallments');

  if(monthlyList){
    monthlyList.innerHTML='';
  }


  if(
    c.paymentSchedule==='Monthly'
  ){

    const monthlyInstallments=
      Array.isArray(
        c.monthlyInstallments
      )
        ? c.monthlyInstallments
        : [];


    if(monthlyInstallments.length){

      monthlyInstallments.forEach(
        item=>
          addClassMonthlyInstallment(
            Number(item.amount||0)
              .toFixed(2),
            item.dueDate
          )
      );

    }else{

      rebuildClassMonthlyInstallments();
    }
  }


  const list=
    $('#classCustomInstallments');

  if(list){
    list.innerHTML='';
  }


  if(
    c.paymentSchedule==='Custom'
  ){

    const installments=
      Array.isArray(
        c.customInstallments
      )
        ? c.customInstallments
        : [];

    if(installments.length){

      installments.forEach(
        item=>
          addClassCustomInstallment(
            item.amount,
            item.dueDate
          )
      );

    }else{

      resetClassCustomInstallments();
    }

  }else{

    resetClassCustomInstallments();
  }


  updateClassTypeUI();
  updateClassPaymentUI();
  updateClassParentReminderUI();
  updateClassCustomInstallmentTotal();


  $('#saveClass').textContent=
    'Save changes';


  $('#className')
    .scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

  $('#className').focus();


  toast(
    `Editing ${c.name}.`
  );
}



function clearClassSaveError(){

  const box=
    $('#classSaveError');

  if(!box){
    return;
  }

  box.textContent='';
  hide(box);
}


function showClassSaveError(
  message
){

  const box=
    $('#classSaveError');

  if(!box){
    toast(message);
    return;
  }

  box.textContent=
    String(message||'');

  show(box);

  box.scrollIntoView({
    behavior:'smooth',
    block:'nearest'
  });
}


function classTuitionAmount(){

  return Number(
    $('#classTuition')?.value || 0
  );
}



function classMonthlyInstallmentRows(){

  return [
    ...document.querySelectorAll(
      '#classMonthlyInstallments .vf-monthly-installment-row'
    )
  ];
}


function monthlyInstallmentDate(
  firstDate,
  monthOffset
){

  const parts=
    String(firstDate||'')
      .split('-')
      .map(Number);

  if(parts.length!==3){
    return '';
  }

  const [year,month,day]=parts;

  if(
    !year ||
    !month ||
    !day
  ){
    return '';
  }

  const targetMonthIndex=
    (month-1)+Number(monthOffset||0);

  const targetYear=
    year+
    Math.floor(targetMonthIndex/12);

  const normalizedMonth=
    ((targetMonthIndex%12)+12)%12;

  const lastDay=
    new Date(
      targetYear,
      normalizedMonth+1,
      0,
      12,0,0,0
    ).getDate();

  const targetDay=
    Math.min(
      day,
      lastDay
    );

  return (
    `${targetYear}-`+
    `${String(normalizedMonth+1).padStart(2,'0')}-`+
    `${String(targetDay).padStart(2,'0')}`
  );
}


function generatedMonthlyInstallments(){

  const tuition=
    classTuitionAmount();

  const firstDate=
    $('#classMonthlyFirstDueDate')
      ?.value || '';

  const count=
    Math.max(
      0,
      Math.floor(
        Number(
          $('#classMonthlyPaymentCount')
            ?.value || 0
        )
      )
    );

  if(
    !(tuition>0) ||
    !firstDate ||
    !(count>0)
  ){
    return [];
  }


  /*
   * Work in pennies so installment totals always
   * equal tuition exactly.
   */
  const totalCents=
    Math.round(
      tuition*100
    );

  const baseCents=
    Math.floor(
      totalCents/count
    );

  let extraPennies=
    totalCents-
    baseCents*count;


  return Array.from(
    {
      length:count
    },
    (_,index)=>{

      const cents=
        baseCents+
        (
          extraPennies>0
            ? 1
            : 0
        );

      if(extraPennies>0){
        extraPennies--;
      }

      return {
        amount:
          cents/100,

        dueDate:
          monthlyInstallmentDate(
            firstDate,
            index
          )
      };
    }
  );
}


function addClassMonthlyInstallment(
  amount='',
  dueDate=''
){

  const list=
    $('#classMonthlyInstallments');

  if(!list){
    return;
  }

  const row=
    document.createElement('div');

  row.className=
    'vf-custom-installment-row vf-monthly-installment-row';

  row.innerHTML=`
    <label class="vf-field-label">
      <span>Amount</span>
      <div class="vf-money-field">
        <span>$</span>
        <input
          class="input"
          type="number"
          min="0"
          step=".01"
          data-monthly-installment-amount
          value="${esc(amount)}">
      </div>
    </label>

    <label class="vf-field-label">
      <span>Due date</span>
      <input
        class="input"
        type="date"
        data-monthly-installment-date
        value="${esc(dueDate)}">
    </label>
  `;

  list.appendChild(row);


  row.querySelector(
    '[data-monthly-installment-amount]'
  )?.addEventListener(
    'input',
    ()=>{

      clearClassSaveError();
      updateClassMonthlyInstallmentTotal();
    }
  );


  row.querySelector(
    '[data-monthly-installment-date]'
  )?.addEventListener(
    'input',
    clearClassSaveError
  );
}


function readClassMonthlyInstallments(){

  return classMonthlyInstallmentRows()
    .map(
      row=>({
        amount:
          Number(
            row.querySelector(
              '[data-monthly-installment-amount]'
            )?.value || 0
          ),

        dueDate:
          row.querySelector(
            '[data-monthly-installment-date]'
          )?.value || ''
      })
    );
}


function updateClassMonthlyInstallmentTotal(){

  const box=
    $('#classMonthlyInstallmentTotal');

  if(!box){
    return;
  }

  const tuition=
    classTuitionAmount();

  const installments=
    readClassMonthlyInstallments();

  const total=
    installments.reduce(
      (sum,item)=>
        sum+
        Number(item.amount||0),
      0
    );

  box.classList.remove(
    'vf-installment-total-good',
    'vf-installment-total-bad'
  );


  if(!installments.length){

    box.textContent=
      'Enter the first payment date and number of payments.';

    return;
  }


  if(
    tuition>0 &&
    Math.abs(total-tuition)<0.005
  ){

    box.classList.add(
      'vf-installment-total-good'
    );

    box.textContent=
      `Payment total: $${total.toFixed(2)} — matches tuition.`;

    return;
  }


  box.classList.add(
    'vf-installment-total-bad'
  );

  box.textContent=
    `Payment total: $${total.toFixed(2)} · Tuition: $${tuition.toFixed(2)}`;
}


function rebuildClassMonthlyInstallments(){

  const list=
    $('#classMonthlyInstallments');

  if(!list){
    return;
  }

  list.innerHTML='';


  const generated=
    generatedMonthlyInstallments();


  generated.forEach(
    item=>
      addClassMonthlyInstallment(
        item.amount.toFixed(2),
        item.dueDate
      )
  );


  updateClassMonthlyInstallmentTotal();
}


function validateClassMonthlyInstallments(){

  const tuition=
    classTuitionAmount();

  const firstDate=
    $('#classMonthlyFirstDueDate')
      ?.value || '';

  const count=
    Math.floor(
      Number(
        $('#classMonthlyPaymentCount')
          ?.value || 0
      )
    );


  if(!firstDate){

    showClassSaveError(
      'Enter the first monthly payment due date.'
    );

    return null;
  }


  if(!(count>0)){

    showClassSaveError(
      'Enter the number of monthly payments.'
    );

    return null;
  }


  const installments=
    readClassMonthlyInstallments();


  if(
    installments.length!==count
  ){

    showClassSaveError(
      'The monthly payment schedule is incomplete. Re-enter the first payment date or number of payments.'
    );

    return null;
  }


  if(
    installments.some(
      item=>
        !(item.amount>0) ||
        !item.dueDate
    )
  ){

    showClassSaveError(
      'Every monthly payment needs both an amount and a due date.'
    );

    return null;
  }


  const total=
    installments.reduce(
      (sum,item)=>
        sum+
        Number(item.amount||0),
      0
    );


  if(
    !tuition ||
    Math.abs(total-tuition)>=0.005
  ){

    showClassSaveError(
      `Monthly payments total $${total.toFixed(2)}, but tuition is $${tuition.toFixed(2)}. Adjust the amounts so they match exactly.`
    );

    return null;
  }


  return installments;
}


function classCustomInstallmentRows(){

  return [
    ...document.querySelectorAll(
      '#classCustomInstallments .vf-custom-installment-row'
    )
  ];
}


function updateClassCustomInstallmentTotal(){

  const box=
    $('#classCustomInstallmentTotal');

  if(!box){
    return;
  }

  const tuition=
    classTuitionAmount();

  const total=
    classCustomInstallmentRows()
      .reduce(
        (sum,row)=>
          sum+
          Number(
            row.querySelector(
              '[data-installment-amount]'
            )?.value || 0
          ),
        0
      );

  const difference=
    tuition-total;

  box.classList.remove(
    'vf-installment-total-good',
    'vf-installment-total-bad'
  );

  if(!tuition && !total){

    box.textContent=
      'Enter tuition above to compare the installment total.';

    return;
  }

  if(Math.abs(difference)<0.005){

    box.classList.add(
      'vf-installment-total-good'
    );

    box.textContent=
      `Installment total: $${total.toFixed(2)} — matches tuition.`;

    return;
  }

  box.classList.add(
    'vf-installment-total-bad'
  );

  box.textContent=
    `Installment total: $${total.toFixed(2)} · Tuition: $${tuition.toFixed(2)}`;
}


function addClassCustomInstallment(
  amount='',
  dueDate=''
){

  const list=
    $('#classCustomInstallments');

  if(!list){
    return;
  }

  const row=
    document.createElement('div');

  row.className=
    'vf-custom-installment-row';

  row.innerHTML=`
    <label class="vf-field-label">
      <span>Amount</span>
      <div class="vf-money-field">
        <span>$</span>
        <input
          class="input"
          type="number"
          min="0"
          step=".01"
          data-installment-amount
          value="${esc(amount)}">
      </div>
    </label>

    <label class="vf-field-label">
      <span>Due date</span>
      <input
        class="input"
        type="date"
        data-installment-date
        value="${esc(dueDate)}">
    </label>

    <button
      type="button"
      class="vf-remove-installment"
      data-remove-installment>
      Remove
    </button>
  `;

  list.appendChild(row);

  row.querySelector(
    '[data-installment-amount]'
  )?.addEventListener(
    'input',
    ()=>{

      clearClassSaveError();
      updateClassCustomInstallmentTotal();
    }
  );


  row.querySelector(
    '[data-installment-date]'
  )?.addEventListener(
    'input',
    clearClassSaveError
  );

  row.querySelector(
    '[data-remove-installment]'
  )?.addEventListener(
    'click',
    ()=>{

      row.remove();

      if(
        classCustomInstallmentRows()
          .length===0
      ){
        addClassCustomInstallment();
      }

      updateClassCustomInstallmentTotal();
    }
  );

  updateClassCustomInstallmentTotal();
}


function resetClassCustomInstallments(){

  const list=
    $('#classCustomInstallments');

  if(!list){
    return;
  }

  list.innerHTML='';

  addClassCustomInstallment();
  addClassCustomInstallment();

  updateClassCustomInstallmentTotal();
}


function readClassCustomInstallments(){

  return classCustomInstallmentRows()
    .map(row=>({
      amount:Number(
        row.querySelector(
          '[data-installment-amount]'
        )?.value || 0
      ),
      dueDate:
        row.querySelector(
          '[data-installment-date]'
        )?.value || ''
    }));
}


function validateClassCustomInstallments(){

  const tuition=
    classTuitionAmount();

  const installments=
    readClassCustomInstallments();

  if(!installments.length){

    showClassSaveError(
      'Add at least one custom installment before saving.'
    );

    return null;
  }

  if(
    installments.some(
      item=>
        !(item.amount>0) ||
        !item.dueDate
    )
  ){

    showClassSaveError(
      'Each installment needs both an amount and a due date.'
    );

    return null;
  }

  const total=
    installments.reduce(
      (sum,item)=>sum+item.amount,
      0
    );

  if(
    !tuition ||
    Math.abs(total-tuition)>=0.005
  ){

    showClassSaveError(
      `Installments total $${total.toFixed(2)}, but tuition is $${tuition.toFixed(2)}. Adjust the installment amounts so they match exactly.`
    );

    return null;
  }

  return installments;
}



function selectedClassIsTutoring(){

  return (
    $('#classType')?.value ===
    'Tutoring'
  );
}


function updateClassTypeUI(){

  const tutoring=
    selectedClassIsTutoring();

  const settings=
    $('#classTutoringSettings');

  const tuition=
    $('#classTuition');

  const payment=
    $('#classPaymentSchedule');


  if(settings){

    tutoring
      ? show(settings)
      : hide(settings);
  }


  /*
   * Existing regular-class payment behavior is preserved.
   * Tutoring has no predetermined tuition obligation.
   */
  if(tuition){

    tuition.disabled=
      tutoring;

    tuition.placeholder=
      tutoring
        ? 'No fixed tuition for tutoring'
        : 'Tuition';

    if(tutoring){
      tuition.value='';
    }
  }


  if(payment){

    payment.disabled=
      tutoring;
  }


  const paymentSection=
    payment?.closest(
      '.vf-class-section'
    );


  if(paymentSection){

    tutoring
      ? hide(paymentSection)
      : show(paymentSection);
  }


  const options=
    document.querySelector(
      '.vf-class-options'
    );


  if(options){

    tutoring
      ? hide(options)
      : show(options);
  }
}


if($('#classType')){

  $('#classType')
    .addEventListener(
      'change',
      ()=>{

        clearClassSaveError();
        updateClassTypeUI();
        updateClassPaymentUI();
      }
    );


  updateClassTypeUI();
}


function updateClassPaymentUI(){

  const schedule=
    $('#classPaymentSchedule')?.value ||
    'Full';

  const dueDate=
    $('#classDueDateWrap');

  const monthlySetup=
    $('#classMonthlySetupWrap');

  const monthlySchedule=
    $('#classMonthlyInstallmentsWrap');

  const custom=
    $('#classCustomInstallmentsWrap');


  if(schedule==='Monthly'){

    hide(dueDate);
    show(monthlySetup);
    show(monthlySchedule);
    hide(custom);

    if(
      classMonthlyInstallmentRows()
        .length===0
    ){
      rebuildClassMonthlyInstallments();
    }

    updateClassMonthlyInstallmentTotal();

  }else if(schedule==='Custom'){

    hide(dueDate);
    hide(monthlySetup);
    hide(monthlySchedule);
    show(custom);

    if(
      classCustomInstallmentRows()
        .length===0
    ){
      resetClassCustomInstallments();
    }

    updateClassCustomInstallmentTotal();

  }else{

    show(dueDate);
    hide(monthlySetup);
    hide(monthlySchedule);
    hide(custom);
  }
}


function updateClassParentReminderUI(){

  const enabled=
    Boolean(
      $('#classParentReminderEnabled')
        ?.checked
    );

  const options=
    $('#classParentReminderOptions');

  if(!options){
    return;
  }

  enabled
    ? show(options)
    : hide(options);
}


if($('#classPaymentSchedule')){

  $('#classPaymentSchedule')
    .addEventListener(
      'change',
      ()=>{

        clearClassSaveError();
        updateClassPaymentUI();
      }
    );

  updateClassPaymentUI();
}


if($('#classParentReminderEnabled')){

  $('#classParentReminderEnabled')
    .addEventListener(
      'change',
      updateClassParentReminderUI
    );

  updateClassParentReminderUI();
}



if($('#classMonthlyFirstDueDate')){

  $('#classMonthlyFirstDueDate')
    .addEventListener(
      'change',
      ()=>{

        clearClassSaveError();
        rebuildClassMonthlyInstallments();
      }
    );
}


if($('#classMonthlyPaymentCount')){

  $('#classMonthlyPaymentCount')
    .addEventListener(
      'input',
      ()=>{

        clearClassSaveError();
        rebuildClassMonthlyInstallments();
      }
    );
}


if($('#addClassInstallment')){

  $('#addClassInstallment')
    .addEventListener(
      'click',
      ()=>addClassCustomInstallment()
    );
}


if($('#classTuition')){

  $('#classTuition')
    .addEventListener(
      'input',
      ()=>{

        clearClassSaveError();

        if(
          $('#classPaymentSchedule')
            ?.value==='Monthly'
        ){
          rebuildClassMonthlyInstallments();
        }

        updateClassCustomInstallmentTotal();
      }
    );
}


$('#saveClass').onclick=async()=>{

  clearClassSaveError();

  let name=$('#className').value.trim();

  if(!name){

    showClassSaveError(
      'Enter a class name before saving.'
    );

    return;
  }

  const classType=
    $('#classType')?.value==='Tutoring'
      ? 'Tutoring'
      : 'Class';


  const tutoring=
    classType==='Tutoring';


  const sessionLengthMinutes=
    tutoring
      ? Math.max(
          1,
          Math.round(
            Number(
              $('#classSessionLength')?.value || 60
            )
          )
        )
      : null;


  const ratePerSession=
    tutoring
      ? Math.max(
          0,
          Number(
            $('#classSessionRate')?.value || 0
          )
        )
      : null;


  const invoiceDaysAfterStart=
    tutoring
      ? Math.max(
          0,
          Math.min(
            365,
            Math.round(
              Number(
                $('#classInvoiceDaysAfterStart')?.value || 0
              )
            )
          )
        )
      : null;


  if(
    tutoring &&
    !(ratePerSession>0)
  ){

    showClassSaveError(
      'Enter the tutoring rate per session.'
    );

    return;
  }


  const paymentSchedule=
    tutoring
      ? 'Per Session'
      : $('#classPaymentSchedule').value;

  let customInstallments=[];
  let monthlyInstallments=[];


  if(paymentSchedule==='Monthly'){

    const checkedMonthly=
      validateClassMonthlyInstallments();

    if(!checkedMonthly){
      return;
    }

    monthlyInstallments=
      checkedMonthly;
  }


  if(paymentSchedule==='Custom'){

    const checked=
      validateClassCustomInstallments();

    if(!checked){
      return;
    }

    customInstallments=checked;
  }

  const existingClass=
    editingClassId
      ? classes.find(
          item=>item.id===editingClassId
        )
      : null;


  let data={
    name,

    classType,

    sessionLengthMinutes,

    ratePerSession,

    invoiceDaysAfterStart,

    term:$('#classTerm').value.trim(),

    tuition:
      tutoring
        ? null
        : (
            Number(
              $('#classTuition').value
            ) || null
          ),

    location:$('#classLocation').value.trim(),

    paymentSchedule,

    paymentDueDate:
      !tutoring &&
      paymentSchedule==='Full'
        ? ($('#classPaymentDueDate').value || '')
        : '',

    monthlyFirstDueDate:
      !tutoring &&
      !tutoring &&
      paymentSchedule==='Monthly'
        ? (
            $('#classMonthlyFirstDueDate')
              .value || ''
          )
        : '',

    monthlyPaymentCount:
      paymentSchedule==='Monthly'
        ? Math.floor(
            Number(
              $('#classMonthlyPaymentCount')
                .value || 0
            )
          )
        : null,

    monthlyInstallments:
      paymentSchedule==='Monthly'
        ? monthlyInstallments
        : [],

    /*
     * Keep legacy dueDay for existing service code.
     * It is derived from the first monthly payment date.
     */
    dueDay:
      !tutoring &&
      paymentSchedule==='Monthly' &&
      $('#classMonthlyFirstDueDate').value
        ? Number(
            $('#classMonthlyFirstDueDate')
              .value
              .split('-')[2]
          )
        : null,

    customInstallments:
      !tutoring &&
      paymentSchedule==='Custom'
        ? customInstallments
        : [],

    lateFee:
      Number($('#classLateFee').value||0),

    lateFeeGraceDays:
      Number($('#classLateFeeGraceDays').value||0),

    vendorAlertDays:
      Number($('#classVendorAlertDays').value||0),

    parentReminderEnabled:
      Boolean($('#classParentReminderEnabled').checked),

    parentReminderDays:
      Number($('#classParentReminderDays').value||0),

    reminderSubject:
      $('#classReminderSubject').value.trim(),

    reminderBody:
      $('#classReminderBody').value.trim(),

    automaticLateFeeNotice:
      true,

    activeStudentCount:
      existingClass
        ? Number(existingClass.activeStudentCount||0)
        : 0,

    updatedAt:serverTimestamp()
  };


  if(!existingClass){
    data.createdAt=
      serverTimestamp();
  }

  let savedClassId='';


  if(existingClass){

    savedClassId=
      existingClass.id;

    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'classes',
        existingClass.id
      ),
      data,
      {
        merge:true
      }
    );

    await log(
      'Class updated',
      name,
      'Manual'
    );

  }else{

    const r=
      await addDoc(
        sub('classes'),
        data
      );

    savedClassId=
      r.id;

    await log(
      'Class created',
      name,
      'Manual'
    );
  }


  await refreshAll();

  /*
   * Saving is complete. Return the left-side class form
   * to a clean new-entry state instead of leaving the
   * saved class selected.
   */
  $('#classSelect').value='';

  roster=[];

  renderRoster();
  renderSelectedClassDetails();

  $('#className').value='';

  if($('#classType')){
    $('#classType').value='Class';
  }

  if($('#classSessionLength')){
    $('#classSessionLength').value='60';
  }

  if($('#classSessionRate')){
    $('#classSessionRate').value='';
  }

  if($('#classInvoiceDaysAfterStart')){
    $('#classInvoiceDaysAfterStart').value='14';
  }

  $('#classTerm').value='';
  $('#classTuition').value='';
  $('#classLocation').value='';

  $('#classPaymentSchedule').value='Full';
  $('#classPaymentDueDate').value='';

  $('#classMonthlyFirstDueDate').value='';
  $('#classMonthlyPaymentCount').value='4';

  if($('#classMonthlyInstallments')){
    $('#classMonthlyInstallments').innerHTML='';
  }

  resetClassCustomInstallments();
  updateClassTypeUI();
  updateClassPaymentUI();

  $('#classLateFee').value='0';
  $('#classLateFeeGraceDays').value='0';
  $('#classVendorAlertDays').value='3';
  $('#classParentReminderEnabled').checked=false;
  $('#classParentReminderDays').value='3';
  $('#classReminderSubject').value=
    'Payment reminder for {{studentName}}';
  $('#classReminderBody').value=
`Hi {{parentName}},

This is a reminder that {{amountDue}} is due on {{dueDate}} for {{studentName}} — {{serviceName}}.

Payment instructions:
{{paymentInstructions}}

Thank you,
{{businessName}}`;

  const wasEditing=
    Boolean(editingClassId);

  editingClassId='';

  $('#saveClass').textContent=
    'Save class';


  clearClassSaveError();

  toast(
    wasEditing
      ? 'Class updated.'
      : 'Class saved.'
  );
};

$('#classSelect').onchange=async()=>{

  /*
   * Changing the selected class is viewing that class,
   * not continuing an old edit.
   */
  editingClassId='';

  $('#saveClass').textContent=
    'Save class';

  preview=[];
  hide($('#previewCard'));

  await loadRoster();

  renderRoster();
  renderSelectedClassDetails();
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


  const activeCertificates=
    studentCertificates(student.studentName)
      .filter(
        c=>
          !c.deleted &&
          ![
            'cancelled',
            'deleted'
          ].includes(
            String(c.status||'')
              .toLowerCase()
          )
      );


  const certificateTotal=
    activeCertificates
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
    activeCertificates,
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
            View account
          </span>

        </button>
      `;
    }).join('');


  $$('[data-global-student]')
    .forEach(button=>{

      button.onclick=()=>{

        openGlobalStudentAccount(
          button.dataset.globalStudent
        );
      };
    });


  show(results);
}


function openGlobalStudentAccount(studentId){

  const student=
    students.find(
      item=>item.id===studentId
    );

  if(!student){
    return;
  }


  /*
   * Global student search is primarily an account lookup.
   * Take the vendor to the student's financial/service card
   * instead of assuming they want to edit the student.
   */
  switchView(
    'students'
  );

  hide(
    $('#globalStudentSearchResults')
  );


  requestAnimationFrame(()=>{

    const card=
      document.querySelector(
        `[data-student-account-id="${CSS.escape(studentId)}"]`
      );

    if(!card){
      return;
    }

    card.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

    card.classList.add(
      'vf-student-search-target'
    );

    setTimeout(
      ()=>{
        card.classList.remove(
          'vf-student-search-target'
        );
      },
      2200
    );
  });
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


        const availableTutoringCredit=
          tutoringAvailableCredit(
            student
          );


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
                      <small>
                        ${
                          tutoringClassForService(service)
                            ? 'Tutoring charges'
                            : 'Service price'
                        }
                      </small>

                      <strong>
                        ${money(service.totalPrice)}
                      </strong>
                    </div>

                  </div>


                  ${serviceObligationHTML(service)}



                </div>

              `).join('')

            : `
                <div class="vf-service-empty">
                  No service has been added yet.
                </div>
              `;


        return `
          <div
            class="vf-student-account"
            data-student-account-id="${student.id}">

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

              ${
                account.activeCertificates.length
                  ? `
                    <button
                      type="button"
                      class="vf-student-certificate-link"
                      data-student-certificate="${student.id}">
                      ${
                        account.activeCertificates.length===1
                          ? 'View certificate'
                          : `View ${account.activeCertificates.length} certificates`
                      }
                    </button>
                  `
                  : ''
              }

            </div>


            ${account.charterReceivable>0
              ? `
                ${
                  account.activeCertificates.length===1 &&
                  account.activeCertificates[0].pdfObjectKey
                    ? `
                      <button
                        type="button"
                        class="vf-charter-receivable vf-charter-receivable-link"
                        data-student-certificate="${student.id}">
                    `
                    : `<div class="vf-charter-receivable">`
                }
                  Charter receivable:
                  <strong>
                    ${money(account.charterReceivable)}
                  </strong>
                  — parent obligation has already been satisfied
                  by the certificate.
                  ${
                    account.activeCertificates.length===1 &&
                    account.activeCertificates[0].pdfObjectKey
                      ? `<span class="vf-receivable-view">View certificate</span>`
                      : ''
                  }
                ${
                  account.activeCertificates.length===1 &&
                  account.activeCertificates[0].pdfObjectKey
                    ? `</button>`
                    : `</div>`
                }
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


  $$('[data-student-certificate]')
    .forEach(button=>{

      button.onclick=()=>{

        const student=
          students.find(
            item=>
              item.id===
              button.dataset.studentCertificate
          );


        if(!student){
          return;
        }


        const linked=
          studentCertificates(
            student.studentName
          )
            .filter(
              cert=>
                !cert.deleted &&
                ![
                  'cancelled',
                  'deleted'
                ].includes(
                  String(cert.status||'')
                    .toLowerCase()
                )
            );


        if(linked.length===1){

          openSavedCertificateEvidence(
            linked[0].id
          );

          return;
        }


        if(linked.length>1){

          switchView(
            'certificates'
          );


          requestAnimationFrame(()=>{

            const list=
              $('#certificateList');

            if(!list){
              return;
            }


            const wanted=
              normalizedName(
                student.studentName
              );


            Array.from(
              list.querySelectorAll(
                '[data-certificate-id]'
              )
            )
              .forEach(record=>{

                const text=
                  normalizedName(
                    record.textContent||''
                  );


                record.style.display=
                  text.includes(wanted)
                    ? ''
                    : 'none';
              });


            list.scrollIntoView({
              behavior:'smooth',
              block:'start'
            });
          });


          return;
        }


        toast(
          'No active certificate was found for this student.'
        );
      };
    });


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



/* ==========================================================
   STUDENT PAYMENT OBLIGATIONS
   ========================================================== */


/*
 * An obligation is one specific amount due on one specific date
 * for one student service.
 *
 * IMPORTANT:
 * Obligations do NOT replace the existing balance calculation yet.
 * They are the dated foundation for future reminders, late fees,
 * payment allocation and certificate allocation.
 */


function serviceObligations(
  serviceId
){

  return obligations
    .filter(
      obligation=>
        obligation.serviceId===serviceId &&
        !obligation.deleted
    )
    .sort(
      (a,b)=>
        String(a.dueDate||'')
          .localeCompare(
            String(b.dueDate||'')
          )
    );
}


function classPaymentItemsForObligations(
  classRecord,
  serviceTotal
){

  if(!classRecord){

    return {
      items:[],
      reason:
        'This service is not linked to a class payment plan.'
    };
  }


  const total=
    Number(serviceTotal||0);

  const classTuition=
    Number(classRecord.tuition||0);


  /*
   * Never quietly reshape a class payment plan if this
   * individual service price was overridden.
   *
   * Individual obligation editing comes next.
   */
  if(
    total>0 &&
    classTuition>0 &&
    Math.abs(total-classTuition)>=0.005
  ){

    return {
      items:[],
      reason:
        `Service price ${money(total)} differs from class tuition `+
        `${money(classTuition)}. Set this student's payment schedule manually.`
    };
  }


  const schedule=
    classRecord.paymentSchedule ||
    'Full';


  let items=[];


  if(schedule==='Full'){

    if(
      classRecord.paymentDueDate &&
      total>0
    ){

      items=[
        {
          amount:total,
          dueDate:
            classRecord.paymentDueDate
        }
      ];
    }

  }else if(schedule==='Monthly'){

    items=
      Array.isArray(
        classRecord.monthlyInstallments
      )
        ? classRecord.monthlyInstallments
            .map(
              item=>({
                amount:
                  Number(item.amount||0),

                dueDate:
                  item.dueDate||''
              })
            )
        : [];

  }else if(schedule==='Custom'){

    items=
      Array.isArray(
        classRecord.customInstallments
      )
        ? classRecord.customInstallments
            .map(
              item=>({
                amount:
                  Number(item.amount||0),

                dueDate:
                  item.dueDate||''
              })
            )
        : [];
  }


  items=
    items.filter(
      item=>
        Number(item.amount||0)>0 &&
        Boolean(item.dueDate)
    );


  if(!items.length){

    return {
      items:[],
      reason:
        'The class does not yet have a complete dated payment schedule.'
    };
  }


  const itemTotal=
    items.reduce(
      (sum,item)=>
        sum+
        Number(item.amount||0),
      0
    );


  if(
    total>0 &&
    Math.abs(itemTotal-total)>=0.005
  ){

    return {
      items:[],
      reason:
        `The class payment schedule totals ${money(itemTotal)}, `+
        `but this service is ${money(total)}. Review before creating obligations.`
    };
  }


  return {
    items,
    reason:''
  };
}


function serviceLateFeeApplicationDate(
  dueDate,
  graceDays
){

  /*
   * Same convention as the class reminder rule:
   *
   * Due Sep 1 + 3 grace days:
   * Sep 2, 3, 4 are grace days
   * fee becomes eligible Sep 5.
   */
  return classLateFeeDate(
    dueDate,
    Number(graceDays||0)
  );
}


async function createServiceObligations(
  serviceRef,
  serviceRecord,
  classRecord
){

  if(
    !serviceRef ||
    !serviceRecord ||
    !classRecord ||
    serviceRecord.serviceType!=='Class'
  ){

    return {
      created:0,
      reason:''
    };
  }


  const result=
    classPaymentItemsForObligations(
      classRecord,
      serviceRecord.totalPrice
    );


  if(!result.items.length){

    await setDoc(
      serviceRef,
      {
        obligationScheduleStatus:
          'Needs Review',

        obligationScheduleReason:
          result.reason,

        obligationCount:0,

        obligationTotal:0,

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    return {
      created:0,
      reason:
        result.reason
    };
  }


  let created=0;
  let total=0;


  for(
    let index=0;
    index<result.items.length;
    index++
  ){

    const item=
      result.items[index];

    const amount=
      Number(item.amount||0);

    total+=amount;


    /*
     * Deterministic ID:
     * calling this function twice cannot create duplicate
     * obligations for the same service/payment number.
     */
    const obligationId=
      `${serviceRef.id}__${String(index+1).padStart(3,'0')}`;


    const obligationRef=
      doc(
        db,
        'vendors',
        user.uid,
        'obligations',
        obligationId
      );


    const existing=
      await getDoc(
        obligationRef
      );


    if(existing.exists()){
      continue;
    }


    const lateFee=
      Number(
        serviceRecord.lateFee ??
        classRecord.lateFee ??
        0
      );

    const graceDays=
      Number(
        serviceRecord.lateFeeGraceDays ??
        classRecord.lateFeeGraceDays ??
        0
      );


    await setDoc(
      obligationRef,
      {
        serviceId:
          serviceRef.id,

        studentId:
          serviceRecord.studentId||'',

        studentName:
          serviceRecord.studentName||'',

        classId:
          classRecord.id||'',

        className:
          classRecord.name||serviceRecord.name||'',

        serviceName:
          serviceRecord.name||classRecord.name||'',

        sequence:
          index+1,

        amount,

        originalAmount:
          amount,

        remainingAmount:
          amount,

        creditedAmount:0,

        waivedAmount:0,

        dueDate:
          item.dueDate,

        status:
          'Scheduled',

        paymentSchedule:
          classRecord.paymentSchedule||'Full',

        lateFeeAmount:
          lateFee,

        lateFeeGraceDays:
          graceDays,

        lateFeeDate:
          lateFee>0
            ? serviceLateFeeApplicationDate(
                item.dueDate,
                graceDays
              )
            : '',

        lateFeeApplied:false,

        lateFeeWaived:false,

        vendorAlertDays:
          Number(
            classRecord.vendorAlertDays||0
          ),

        parentReminderEnabled:
          Boolean(
            classRecord.parentReminderEnabled
          ),

        parentReminderDays:
          Number(
            classRecord.parentReminderDays||0
          ),

        automaticLateFeeNotice:
          Boolean(
            classRecord.automaticLateFeeNotice
          ),

        source:
          'Class payment plan',

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    created++;
  }


  await setDoc(
    serviceRef,
    {
      paymentScheduleSource:
        'Class payment plan',

      paymentScheduleSnapshot:
        classRecord.paymentSchedule||'Full',

      obligationScheduleStatus:
        'Ready',

      obligationScheduleReason:
        '',

      obligationCount:
        result.items.length,

      obligationTotal:
        Number(total.toFixed(2)),

      obligationGeneratedAt:
        serverTimestamp(),

      lateFeeGraceDays:
        Number(
          classRecord.lateFeeGraceDays||0
        ),

      vendorAlertDays:
        Number(
          classRecord.vendorAlertDays||0
        ),

      parentReminderEnabled:
        Boolean(
          classRecord.parentReminderEnabled
        ),

      parentReminderDays:
        Number(
          classRecord.parentReminderDays||0
        ),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  return {
    created,
    reason:''
  };
}



function activeCertificateForObligations(
  certificate
){

  if(
    !certificate ||
    certificate.deleted
  ){
    return false;
  }

  return ![
    'cancelled',
    'deleted'
  ].includes(
    String(
      certificate.status||''
    ).toLowerCase()
  );
}


function parentPaymentForObligations(
  payment
){

  if(!payment){
    return false;
  }

  /*
   * Charter payments pay the vendor's receivable.
   * The certificate already satisfied the parent's
   * obligation, so charter cash must NOT credit it twice.
   *
   * Refunds are negative parent payments and therefore
   * reduce the parent-payment funding pool naturally.
   */
  return (
    String(payment.method||'')
      .trim()
      .toLowerCase()
    !==
    'charter payment'
  );
}


function obligationStudentServices(
  studentId
){

  return [
    ...new Set(
      obligations
        .filter(
          obligation=>
            obligation.studentId===studentId &&
            !obligation.deleted
        )
        .map(
          obligation=>
            obligation.serviceId||''
        )
        .filter(Boolean)
    )
  ];
}


function allocationTargetsForRecord(
  record,
  studentObligations
){

  if(!record){
    return [];
  }


  /*
   * Best possible link: exact service.
   */
  if(record.serviceId){

    return studentObligations.filter(
      obligation=>
        obligation.serviceId===
        record.serviceId
    );
  }


  /*
   * Next best: exact class.
   */
  if(record.classId){

    return studentObligations.filter(
      obligation=>
        obligation.classId===
        record.classId
    );
  }


  /*
   * Some payment records carry a class name
   * rather than an ID.
   */
  const className=
    normalizedName(
      record.className ||
      record.class ||
      ''
    );


  if(className){

    const matches=
      studentObligations.filter(
        obligation=>
          normalizedName(
            obligation.className||''
          )===className
      );

    if(matches.length){
      return matches;
    }
  }


  /*
   * Safe fallback:
   * if this student has ONLY ONE obligation-bearing
   * service, there is nothing to guess.
   */
  const serviceIds=[
    ...new Set(
      studentObligations
        .map(
          obligation=>
            obligation.serviceId||''
        )
        .filter(Boolean)
    )
  ];


  if(serviceIds.length===1){
    return studentObligations;
  }


  /*
   * Multiple services + no reliable service/class link:
   * VendorFlow does not quietly guess.
   */
  return [];
}


function emptyObligationAllocation(
  obligation
){

  return {
    ...obligation,

    parentCreditedAmount:0,
    certificateCreditedAmount:0,
    creditedAmount:0,

    remainingAmount:
      Math.max(
        0,
        Number(
          obligation.amount||0
        )-
        Number(
          obligation.waivedAmount||0
        )
      )
  };
}


function applyFundingPool(
  targetObligations,
  amount,
  type
){

  let remaining=
    Number(amount||0);


  /*
   * Negative funding is possible because refunds
   * are stored as negative payments.
   *
   * Reconciliation is deterministic, so below we
   * deal with net funding rather than trying to
   * mutate an old historical allocation.
   */
  if(remaining<=0){
    return;
  }


  const ordered=
    [...targetObligations]
      .sort(
        (a,b)=>{

          const dateCompare=
            String(a.dueDate||'')
              .localeCompare(
                String(b.dueDate||'')
              );

          if(dateCompare){
            return dateCompare;
          }

          return (
            Number(a.sequence||0)-
            Number(b.sequence||0)
          );
        }
      );


  for(const obligation of ordered){

    if(remaining<=0){
      break;
    }


    const available=
      Math.max(
        0,
        Number(
          obligation.remainingAmount||0
        )
      );


    if(available<=0){
      continue;
    }


    const applied=
      Math.min(
        available,
        remaining
      );


    if(type==='certificate'){

      obligation.certificateCreditedAmount=
        Number(
          obligation.certificateCreditedAmount||0
        )+
        applied;

    }else{

      obligation.parentCreditedAmount=
        Number(
          obligation.parentCreditedAmount||0
        )+
        applied;
    }


    obligation.creditedAmount=
      Number(
        obligation.creditedAmount||0
      )+
      applied;


    obligation.remainingAmount=
      Math.max(
        0,
        Number(
          obligation.remainingAmount||0
        )-
        applied
      );


    remaining-=applied;
  }
}


function expectedObligationFunding(){

  const expected=
    new Map(
      obligations
        .filter(
          obligation=>
            !obligation.deleted
        )
        .map(
          obligation=>[
            obligation.id,
            emptyObligationAllocation(
              obligation
            )
          ]
        )
    );


  const studentIds=[
    ...new Set(
      obligations
        .map(
          obligation=>
            obligation.studentId||''
        )
        .filter(Boolean)
    )
  ];


  for(const studentId of studentIds){

    const studentObligations=
      [...expected.values()]
        .filter(
          obligation=>
            obligation.studentId===
            studentId
        );


    /*
     * CERTIFICATES
     *
     * Certificates satisfy parent obligation
     * immediately, even before the charter pays.
     */
    const studentCertificatesForAllocation=
      certs
        .filter(
          certificate=>
            certificate.studentId===
              studentId &&
            activeCertificateForObligations(
              certificate
            )
        );


    for(
      const certificate of
      studentCertificatesForAllocation
    ){

      const targets=
        allocationTargetsForRecord(
          certificate,
          studentObligations
        );


      if(!targets.length){
        continue;
      }


      applyFundingPool(
        targets,
        Number(
          certificate.amount||0
        ),
        'certificate'
      );
    }


    /*
     * PARENT PAYMENTS
     *
     * Group unscoped parent payments as a NET amount.
     * This makes refunds reduce prior parent-payment
     * credit automatically.
     */
    const studentPaymentsForAllocation=
      payments
        .filter(
          payment=>
            payment.studentId===
              studentId &&
            parentPaymentForObligations(
              payment
            )
        );


    const scopedPayments=
      studentPaymentsForAllocation
        .filter(
          payment=>
            payment.serviceId ||
            payment.classId ||
            payment.className ||
            payment.class
        );


    const unscopedPayments=
      studentPaymentsForAllocation
        .filter(
          payment=>
            !(
              payment.serviceId ||
              payment.classId ||
              payment.className ||
              payment.class
            )
        );


    /*
     * NET SCOPED PAYMENTS BY THEIR ACTUAL TARGET.
     *
     * Example:
     *   +$300 Math payment
     *   -$100 Math refund
     * becomes $200 of Math funding.
     *
     * We calculate the target first, so refunds cannot
     * accidentally affect a different service.
     */
    const scopedPaymentGroups=
      new Map();


    for(const payment of scopedPayments){

      const targets=
        allocationTargetsForRecord(
          payment,
          studentObligations
        );


      if(!targets.length){
        continue;
      }


      const targetIds=[
        ...new Set(
          targets
            .map(
              obligation=>
                obligation.serviceId||''
            )
            .filter(Boolean)
        )
      ].sort();


      if(!targetIds.length){
        continue;
      }


      const key=
        targetIds.join('|');


      const group=
        scopedPaymentGroups.get(key) || {
          targets,
          netAmount:0
        };


      group.netAmount+=
        Number(payment.amount||0);


      scopedPaymentGroups.set(
        key,
        group
      );
    }


    for(
      const group of
      scopedPaymentGroups.values()
    ){

      if(group.netAmount<=0){
        continue;
      }


      applyFundingPool(
        group.targets,
        group.netAmount,
        'parent'
      );
    }


    const unscopedNet=
      unscopedPayments.reduce(
        (sum,payment)=>
          sum+
          Number(payment.amount||0),
        0
      );


    if(unscopedNet>0){

      const targets=
        allocationTargetsForRecord(
          {},
          studentObligations
        );


      if(targets.length){

        applyFundingPool(
          targets,
          unscopedNet,
          'parent'
        );
      }
    }
  }


  /*
   * Final status is derived from remaining amount.
   */
  for(const obligation of expected.values()){

    const remaining=
      Number(
        obligation.remainingAmount||0
      );

    const credited=
      Number(
        obligation.creditedAmount||0
      );


    if(remaining<=0.009){

      obligation.status=
        'Funded';

    }else if(credited>0.009){

      obligation.status=
        'Partially funded';

    }else{

      obligation.status=
        'Scheduled';
    }
  }


  return expected;
}


async function reconcileObligationFunding(){

  if(!obligations.length){
    return 0;
  }


  const expected=
    expectedObligationFunding();


  let changed=0;


  for(const obligation of obligations){

    const next=
      expected.get(
        obligation.id
      );

    if(!next){
      continue;
    }


    const fields={
      parentCreditedAmount:
        Number(
          next.parentCreditedAmount||0
        ),

      certificateCreditedAmount:
        Number(
          next.certificateCreditedAmount||0
        ),

      creditedAmount:
        Number(
          next.creditedAmount||0
        ),

      remainingAmount:
        Number(
          next.remainingAmount||0
        ),

      status:
        next.status||'Scheduled'
    };


    const same=
      Math.abs(
        Number(
          obligation.parentCreditedAmount||0
        )-
        fields.parentCreditedAmount
      )<0.005 &&

      Math.abs(
        Number(
          obligation.certificateCreditedAmount||0
        )-
        fields.certificateCreditedAmount
      )<0.005 &&

      Math.abs(
        Number(
          obligation.creditedAmount||0
        )-
        fields.creditedAmount
      )<0.005 &&

      Math.abs(
        Number(
          obligation.remainingAmount ??
          obligation.amount ??
          0
        )-
        fields.remainingAmount
      )<0.005 &&

      String(
        obligation.status||'Scheduled'
      )===
      fields.status;


    if(same){
      continue;
    }


    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'obligations',
        obligation.id
      ),
      {
        ...fields,

        fundingReconciledAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    changed++;
  }


  return changed;
}


function serviceObligationHTML(
  service
){

  const list=
    serviceObligations(
      service.id
    );


  if(!list.length){

    if(
      service.obligationScheduleStatus===
      'Needs Review'
    ){

      return `
        <div class="vf-obligation-warning">
          <strong>Payment schedule needs attention</strong>
          <span>
            ${esc(
              service.obligationScheduleReason ||
              'VendorFlow could not create dated payment obligations.'
            )}
          </span>
        </div>
      `;
    }


    return '';
  }


  return `
    <div class="vf-service-obligations">

      <div class="vf-service-obligations-title">
        Payment obligations
      </div>

      ${list
        .map(
          obligation=>`
            <div class="vf-obligation-row">

              <span>
                Payment ${esc(obligation.sequence||'')}
              </span>

              <strong>
                ${money(obligation.amount)}
              </strong>

              <span>
                due ${esc(
                  classDateLabel(
                    obligation.dueDate
                  )
                )}
              </span>

              <span class="vf-obligation-status">
                ${esc(obligation.status||'Scheduled')}
              </span>

              ${
                Number(obligation.remainingAmount ?? obligation.amount)>0.009 &&
                Number(obligation.creditedAmount||0)>0.009
                  ? `
                    <span class="vf-obligation-remaining">
                      ${money(obligation.remainingAmount)} remaining
                    </span>
                  `
                  : ''
              }

              ${
                Number(obligation.remainingAmount ?? obligation.amount)<=0.009
                  ? `
                    <span class="vf-obligation-funded">
                      Fully funded
                    </span>
                  `
                  : ''
              }

            </div>
          `
        )
        .join('')}

    </div>
  `;
}


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


  /*
   * Class payment rules are defaults only.
   * The vendor may still override them for this individual service.
   */
  if(classRecord.paymentSchedule){
    $('#serviceSchedule').value=
      classRecord.paymentSchedule;
  }

  if(Number(classRecord.dueDay||0)>0){
    $('#serviceDueDay').value=
      Number(classRecord.dueDay);
  }

  if(classRecord.lateFee !== undefined){
    $('#serviceLateFee').value=
      Number(classRecord.lateFee||0);
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


  const serviceRef=
    doc(
      sub('services')
    );


  const serviceData={

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
        classRecord?.paymentSchedule ||
        $('#serviceSchedule').value,

      dueDay:
        Number(
          $('#serviceDueDay').value||4
        ),

      lateFee:
        Number(
          $('#serviceLateFee').value||0
        ),

      lateFeeGraceDays:
        Number(
          classRecord?.lateFeeGraceDays||0
        ),

      vendorAlertDays:
        Number(
          classRecord?.vendorAlertDays||0
        ),

      parentReminderEnabled:
        Boolean(
          classRecord?.parentReminderEnabled
        ),

      parentReminderDays:
        Number(
          classRecord?.parentReminderDays||0
        ),

      status:'Active',

      source:'Manual',

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()    };


  await setDoc(
    serviceRef,
    serviceData
  );


  if(
    classRecord &&
    serviceType==='Class'
  ){

    await createServiceObligations(
      serviceRef,
      {
        ...serviceData,
        studentId,
        studentName:
          student.studentName||''
      },
      classRecord
    );
  }


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
  $('#serviceLateFee').value='0';
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
        classRecord.classType==='Tutoring'
          ? 0
          : Number(
              classRecord.tuition||0
            );


      const serviceRef=
        doc(
          sub('services')
        );


      const serviceData={

          studentId:
            coreStudent.id,

          studentName:
            row.studentName||'',

          serviceType:
            classRecord.classType==='Tutoring'
              ? 'Tutoring'
              : 'Class',

          name:
            classRecord.name||'Class',

          classId:
            classRecord.id,

          classTerm:
            classRecord.term||'',

          location:
            classRecord.location||'',

          totalPrice,

          tutoringRate:
            classRecord.classType==='Tutoring'
              ? Number(
                  classRecord.ratePerSession||0
                )
              : 0,

          sessionLengthMinutes:
            classRecord.classType==='Tutoring'
              ? Number(
                  classRecord.sessionLengthMinutes||60
                )
              : null,

          schedule:
            classRecord.paymentSchedule ||
            'Full',

          dueDay:
            Number(
              classRecord.dueDay||0
            ) || null,

          lateFee:
            Number(classRecord.lateFee||0),

          lateFeeGraceDays:
            Number(
              classRecord.lateFeeGraceDays||0
            ),

          vendorAlertDays:
            Number(
              classRecord.vendorAlertDays||0
            ),

          parentReminderEnabled:
            Boolean(
              classRecord.parentReminderEnabled
            ),

          parentReminderDays:
            Number(
              classRecord.parentReminderDays||0
            ),

          status,

          source:'CSV import',

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()        };


      await setDoc(
        serviceRef,
        serviceData
      );


      if(
        classRecord.classType!=='Tutoring'
      ){

        await createServiceObligations(
          serviceRef,
        {
          ...serviceData,
          studentId:
            coreStudent.id,

          studentName:
            row.studentName||''
        },
        classRecord
      );
      }

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
      'VendorFlow',
      {
        type:'payment',
        id:payment.id
      }
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

  if($('#chargeForm')){
    hide($('#chargeForm'));
  }



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


  const refundRef=
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
    'Manual',
    {
      type:'payment',
      id:refundRef.id
    }
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

  if($('#chargeForm')){
    hide($('#chargeForm'));
  }

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



  const paymentRef=
    await addDoc(
      sub('payments'),
      d
    );


  await log(
    'Payment recorded',
    `${selectedStudent.studentName} — `+
    `${money(amount)} via ${d.method}.`,
    'Manual',
    {
      type:'payment',
      id:paymentRef.id
    }
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

  tryExactCertificateStudentLink();
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




async function openCertificateForRepair(
  certificateId
){

  const cert=
    certs.find(
      item=>item.id===certificateId
    );


  if(!cert){
    return toast(
      'Certificate could not be found.'
    );
  }


  editingCertificateId=
    certificateId;


  switchView(
    'certificates'
  );


  /*
   * Populate the existing certificate form.
   */
  $('#certStudent').value=
    cert.student||'';

  $('#certStudentId').value=
    cert.studentId||'';

  $('#certSchool').value=
    cert.charterSchoolName ||
    cert.school ||
    '';

  $('#certCharterSchoolId').value=
    cert.charterSchoolId||'';

  $('#certAmount').value=
    Number(cert.amount||0);

  $('#certNumber').value=
    cert.number||'';

  $('#certIssueDate').value=
    cert.issueDate||'';

  $('#certServiceStart').value=
    cert.serviceStartDate||'';

  $('#certServiceEnd').value=
    cert.serviceEndDate||'';


  $('#certServiceStart')
    ?.classList.remove(
      'vf-required-attention'
    );

  $('#certServiceEnd')
    ?.classList.remove(
      'vf-required-attention'
    );


  if(
    cert.charterSchoolId &&
    !cert.serviceStartDate
  ){

    $('#certServiceStart')
      ?.classList.add(
        'vf-required-attention'
      );
  }

  $('#certBillingEmail').value=
    cert.billingEmail ||
    cert.charterBillingEmail ||
    '';

  $('#certStatus').value=
    cert.status ||
    'Received - Not Billed';

  $('#certServiceDescription').value=
    cert.serviceDescription||'';

  $('#certInvoiceInstructions').value=
    cert.invoiceInstructions||'';

  $('#certNotes').value=
    cert.notes||'';


  /*
   * No re-upload is required when repairing a certificate.
   * The stored PDF will be re-read below.
   */
  if($('#certPdf')){
    $('#certPdf').value='';
  }


  /*
   * Refresh linked student/charter displays using the IDs
   * already stored on this certificate.
   */
  renderCertificateStudentMatches();
  renderCertificateCharterMatches();


  /*
   * If this certificate already has its PDF stored,
   * re-read that exact PDF automatically during repair.
   *
   * This uses the same proven extraction endpoint as a new
   * upload. No re-upload is required.
   */
  if(cert.pdfObjectKey){

    const status=
      $('#certPdfStatus');

    const review=
      $('#certExtractionReview');


    if(status){
      status.textContent=
        'Existing PDF found. VendorFlow is reading it again…';
    }


    /*
     * Keep the existing secure PDF attached to this record.
     */
    pendingCertificatePdf={
      objectKey:
        cert.pdfObjectKey,

      originalName:
        cert.pdfName||'',

      size:
        Number(cert.pdfSize||0),

      extraction:
        cert.extraction||null
    };


    try{

      const extraction=
        await extractCertificatePdf(
          cert.pdfObjectKey
        );


      pendingCertificatePdf={
        ...pendingCertificatePdf,

        extraction:
          extraction.extraction || {},

        clientValidation:
          validateExtractedCertificate(
            extraction
          ),

        sourceTextLength:
          extraction.sourceTextLength || 0
      };


      /*
       * Fill values found in the PDF.
       * Empty extracted values do not erase known data because
       * setCertificateField intentionally ignores blank values.
       */
      fillCertificateFromExtraction(
        extraction
      );


      /*
       * Restore exact saved links after extraction changes
       * visible student / charter text.
       */
      if(cert.studentId){

        const savedStudent=
          students.find(
            student=>
              student.id===cert.studentId
          );

        if(savedStudent){
          linkCertificateStudent(
            savedStudent
          );
        }
      }


      if(cert.charterSchoolId){

        const savedCharter=
          charterSchools.find(
            charter=>
              charter.id===cert.charterSchoolId &&
              !charter.archived
          );

        if(savedCharter){
          linkCertificateCharter(
            savedCharter
          );
        }

      }else{

        /*
         * If this older certificate was never linked, try an
         * exact safe match using the school name read from PDF.
         */
        const extractedSchool=
          extraction?.extraction?.charterSchool || '';

        const exactCharter=
          findSavedCharterByName(
            extractedSchool
          );

        if(exactCharter){
          linkCertificateCharter(
            exactCharter
          );
        }
      }


      if(status){

        status.innerHTML=
          `Existing PDF read successfully. `+
          `<button type="button" `+
          `class="vf-inline-link" `+
          `data-repair-pdf-view="${esc(cert.pdfObjectKey)}">`+
          `View PDF</button>`;
      }


    }catch(error){

      console.error(error);


      if(status){

        status.innerHTML=
          `Existing PDF is stored securely, but automatic reading failed. `+
          `<button type="button" `+
          `class="vf-inline-link" `+
          `data-repair-pdf-view="${esc(cert.pdfObjectKey)}">`+
          `View PDF</button>`;
      }


      if(review){

        review.className=
          'vf-extraction-review vf-extraction-warning';

        review.innerHTML=
          `<strong>VendorFlow could not automatically re-read this PDF.</strong>
           The certificate is still safely stored.
           Use View PDF if you need to verify a field manually.`;

        show(review);
      }
    }

  }else{

    pendingCertificatePdf=null;

    if($('#certPdfStatus')){
      $('#certPdfStatus').textContent=
        'No PDF attached.';
    }
  }


  show(
    $('#certificateForm')
  );


  /*
   * View PDF remains available inside the repair form.
   */
  $$('[data-repair-pdf-view]')
    .forEach(button=>{

      button.onclick=()=>{

        openCertificatePdf(
          button.dataset.repairPdfView
        );
      };
    });


  $('#saveCertificate').textContent=
    'Save changes';


  $('#certificateForm')
    .scrollIntoView({
      behavior:'smooth',
      block:'start'
    });


  const issue=
    certificateAttentionIssue(
      cert
    );


  toast(
    issue?.code==='missing-service-dates'
      ? 'Enter the service start date, then save. VendorFlow will calculate the invoice-ready date automatically.'
      : 'Fix the highlighted certificate and save your changes.'
  );
}


$('#cancelCertificate').onclick=()=>{

  editingCertificateId='';

  $('#saveCertificate').textContent=
    'Save certificate';

  hide($('#certificateForm'));

  if($('#certPdf')){
    $('#certPdf').value='';
  }

  if($('#certPdfStatus')){
    $('#certPdfStatus').textContent=
      'No PDF selected.';
  }

  pendingCertificatePdf=null;

  clearCertificateCharterLink(
    false
  );

  clearCertificateStudentLink(
    false
  );

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


  $('#certServiceStart')
    ?.classList.remove(
      'vf-required-attention'
    );


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
    selectedCertificateStudent();


  if(!studentMatch){

    renderCertificateStudentMatches();

    return toast(
      'Choose the student from VendorFlow before saving the certificate.'
    );
  }


  button.disabled=true;

  button.textContent =
    pdfFile
      ? 'Uploading PDF…'
      : 'Saving…';


  try{

    const editingCertificate=
      editingCertificateId
        ? certs.find(
            item=>
              item.id===editingCertificateId
          )
        : null;


    let pdf=
      pendingCertificatePdf;


    if(
      editingCertificate &&
      !pdf
    ){

      pdf={
        objectKey:
          editingCertificate.pdfObjectKey||'',

        originalName:
          editingCertificate.pdfName||'',

        size:
          Number(
            editingCertificate.pdfSize||0
          ),

        extraction:
          editingCertificate.extraction||null
      };
    }


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


    const savedCharter=
      selectedCertificateCharter();

    if(!savedCharter){

      const likelyMatches=
        charterSchools.filter(
          charter=>
            !charter.archived &&
            (
              normalizedCharterName(
                charter.name
              ).includes(
                normalizedCharterName(school)
              ) ||
              normalizedCharterName(school)
                .includes(
                  normalizedCharterName(
                    charter.name
                  )
                )
            )
        );


      if(likelyMatches.length){

        button.disabled=false;

        button.textContent=
          'Save certificate';

        renderCertificateCharterMatches();

        return toast(
          'Choose the matching charter school from the suggestions before saving.'
        );
      }
    }


    const serviceStartDate=
      $('#certServiceStart')?.value.trim() || '';


    if(
      savedCharter &&
      !serviceStartDate
    ){

      $('#certServiceStart')
        ?.classList.add(
          'vf-required-attention'
        );

      status=
        'Needs Review';

      $('#certStatus').value=
        'Needs Review';
    }


    const invoiceSchedule=
      certificateInvoiceSchedule(
        serviceStartDate,
        savedCharter,
        studentMatch?.id || ''
      );


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

      charterSchoolId:
        savedCharter?.id || '',

      charterSchoolName:
        savedCharter?.name || school,

      charterMatched:
        Boolean(savedCharter),

      charterBillingEmail:
        savedCharter?.billingEmail || '',

      charterAddress:
        savedCharter?.address || '',

      charterCity:
        savedCharter?.city || '',

      charterState:
        savedCharter?.state || '',

      charterZip:
        savedCharter?.zip || '',

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

      serviceStartDate,

      invoiceDaysAfterStart:
        invoiceSchedule.days,

    paymentTermsDays:
      invoicePaymentTermsDays(
        $('#charterPaymentTerms')?.value
      ),

      invoiceReadyDate:
        invoiceSchedule.readyDate,

      invoiceScheduleValid:
        Boolean(
          savedCharter &&
          invoiceSchedule.valid
        ),

      invoiceScheduleSource:
        invoiceSchedule.source || '',

      tutoringClassId:
        invoiceSchedule.tutoringClassId || '',

      tutoringClassName:
        invoiceSchedule.tutoringClassName || '',

      serviceEndDate:
        $('#certServiceEnd')?.value.trim() || '',

      serviceDescription:
        $('#certServiceDescription')?.value.trim() || '',

      billingEmail:
        $('#certBillingEmail')?.value.trim() ||
        savedCharter?.billingEmail ||
        '',

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


    const duplicateIsCurrentCertificate=
      Boolean(
        editingCertificateId &&
        duplicateCertificate?.id===
          editingCertificateId
      );


    if(
      duplicateCertificate &&
      !duplicateIsCurrentCertificate
    ){

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



    if(editingCertificateId){

      /*
       * Preserve the original creation time and replace only
       * the editable/current certificate data.
       */
      const {
        createdAt,
        ...editableData
      }=data;


      await setDoc(
        doc(
          db,
          'vendors',
          user.uid,
          'certificates',
          editingCertificateId
        ),
        {
          ...editableData,

          updatedAt:
            serverTimestamp()
        },
        {
          merge:true
        }
      );


      await log(
        'Certificate updated',
        `${data.student} — ${money(amount)} — certificate details repaired.`,
        'Manual'
      );


    }else{

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
    }


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

    editingCertificateId='';

    $('#saveCertificate').textContent=
      'Save certificate';

    clearCertificateCharterLink(
      false
    );

    clearCertificateStudentLink(
      false
    );

    if($('#certExtractionReview')){
      hide($('#certExtractionReview'));
      $('#certExtractionReview').innerHTML='';
    }


    hide($('#certificateForm'));

    await refreshAll();


    if(
      savedCharter &&
      serviceStartDate &&
      invoiceSchedule.valid
    ){

      toast(
        `Certificate saved. Invoice scheduled for ${formatVendorDate(invoiceSchedule.readyDate)}.`
      );

    }else if(
      savedCharter &&
      !serviceStartDate
    ){

      toast(
        'Certificate saved, but the service start date is still required before VendorFlow can schedule the invoice.'
      );

    }else{

      toast(
        pdf
          ? 'Certificate and PDF saved.'
          : 'Certificate saved.'
      );
    }


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


async function safeDeleteCertificate(
  certificateId
){

  const certificate=
    certs.find(
      cert=>cert.id===certificateId
    );

  if(!certificate){
    return;
  }


  const ok=
    confirm(
      `Delete this certificate?\n\n` +
      `${certificate.student||'Student'} — ${money(certificate.amount)}\n` +
      `${certificate.school||'Charter school'}\n\n` +
      `This will remove the certificate from active records, ` +
      `remove its credit from the student's account, and cancel ` +
      `any invoice scheduling tied to it.\n\n` +
      `The certificate record and stored PDF will remain preserved ` +
      `in VendorFlow's audit history.`
    );


  if(!ok){
    return;
  }


  await setDoc(
    doc(
      db,
      'vendors',
      user.uid,
      'certificates',
      certificate.id
    ),
    {
      deleted:true,

      status:'Deleted',

      deletedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  await log(
    'Certificate deleted',
    `${certificate.student||'Student'} — ` +
    `${certificate.school||'Charter'} — ` +
    `${certificate.number||'No certificate number'} — ` +
    `${money(certificate.amount)}. ` +
    `Record and PDF preserved.`,
    'Manual'
  );


  await refreshAll();


  toast(
    'Certificate deleted.'
  );
}



function closePaymentDetail(){

  const modal=
    $('#paymentDetailModal');

  if(modal){
    hide(modal);
  }
}


function paymentDetailValue(
  value,
  fallback='—'
){

  const text=
    String(
      value ?? ''
    ).trim();

  return text || fallback;
}


function showPaymentDetail(
  payment
){

  const modal=
    $('#paymentDetailModal');

  const content=
    $('#paymentDetailContent');


  if(
    !modal ||
    !content ||
    !payment
  ){
    return;
  }


  /*
   * Payment Details is shared across Payments and History,
   * so always keep it outside hidden VendorFlow views.
   */
  if(
    modal.parentElement!==
    document.body
  ){
    document.body.appendChild(
      modal
    );
  }


  const amount=
    Number(
      payment.amount || 0
    );


  const isRefund=
    String(
      payment.transactionType || ''
    )
      .toLowerCase()==='refund' ||
    amount<0;


  const type=
    isRefund
      ? 'Refund'
      : 'Payment';


  content.innerHTML=`
    <div class="vf-payment-detail-heading">

      <div>
        <div class="eyebrow">
          ${esc(type)}
        </div>

        <h2 id="paymentDetailTitle">
          ${money(Math.abs(amount))}
        </h2>

        <div class="meta">
          Saved VendorFlow transaction record
        </div>
      </div>

      <span class="vf-payment-detail-type ${isRefund?'refund':'payment'}">
        ${esc(type.toUpperCase())}
      </span>

    </div>


    <div class="vf-payment-detail-grid">

      <div>
        <small>Student</small>
        <strong>
          ${esc(paymentDetailValue(payment.student))}
        </strong>
      </div>

      <div>
        <small>Payer</small>
        <strong>
          ${esc(
            paymentDetailValue(
              payment.payer ||
              payment.parentName
            )
          )}
        </strong>
      </div>

      <div>
        <small>Date</small>
        <strong>
          ${esc(paymentDetailValue(payment.date))}
        </strong>
      </div>

      <div>
        <small>Method</small>
        <strong>
          ${esc(paymentDetailValue(payment.method))}
        </strong>
      </div>

      <div>
        <small>Amount</small>
        <strong>
          ${money(Math.abs(amount))}
        </strong>
      </div>

      <div>
        <small>Source</small>
        <strong>
          ${esc(paymentDetailValue(payment.source))}
        </strong>
      </div>

      ${
        payment.className ||
        payment.class
          ? `
            <div>
              <small>Class</small>
              <strong>
                ${esc(
                  payment.className ||
                  payment.class
                )}
              </strong>
            </div>
          `
          : ''
      }

      ${
        payment.serviceName
          ? `
            <div>
              <small>Service</small>
              <strong>
                ${esc(payment.serviceName)}
              </strong>
            </div>
          `
          : ''
      }

      ${
        payment.matchedBy
          ? `
            <div>
              <small>Matched by</small>
              <strong>
                ${esc(payment.matchedBy)}
              </strong>
            </div>
          `
          : ''
      }

      ${
        payment.parentEmail
          ? `
            <div>
              <small>Parent email</small>
              <strong>
                ${esc(payment.parentEmail)}
              </strong>
            </div>
          `
          : ''
      }

    </div>


    ${
      isRefund
        ? `
          <div class="vf-payment-refund-detail">

            <div class="eyebrow">
              Refund details
            </div>

            <div class="vf-payment-detail-grid">

              <div>
                <small>Reason</small>
                <strong>
                  ${esc(
                    paymentDetailValue(
                      payment.refundReason
                    )
                  )}
                </strong>
              </div>

              <div>
                <small>Manual override</small>
                <strong>
                  ${payment.refundOverride?'Yes':'No'}
                </strong>
              </div>

            </div>

            ${
              payment.refundNote
                ? `
                  <div class="vf-payment-detail-note">
                    <small>Note</small>
                    <div>
                      ${esc(payment.refundNote)}
                    </div>
                  </div>
                `
                : ''
            }

          </div>
        `
        : ''
    }


    <div class="vf-payment-evidence-note">
      <strong>Evidence available:</strong>
      VendorFlow's saved transaction record.
      ${
        payment.pdfObjectKey ||
        payment.receiptObjectKey ||
        payment.proofObjectKey
          ? ' Original documentation is also attached to this record.'
          : ' No receipt or original payment document is currently attached.'
      }
    </div>
  `;


  show(modal);
}


if($('#closePaymentDetail')){

  $('#closePaymentDetail')
    .onclick=
      closePaymentDetail;
}


if($('#paymentDetailModal')){

  $('#paymentDetailModal')
    .onclick=
      event=>{

        if(
          event.target===
          $('#paymentDetailModal')
        ){
          closePaymentDetail();
        }
      };
}


function renderRecords(){
  $('#paymentList').innerHTML=
    payments.length
    ? payments.map(d=>
        `<div
          class="record vf-payment-record"
          data-payment-id="${esc(d.id)}"
          role="button"
          tabindex="0"
          title="Open payment details">
          <strong>$${Number(d.amount).toFixed(2)} — ${esc(d.payer||d.student)}</strong>
          <div class="meta">${esc(d.date)} · ${d.transactionType==='Refund'
          ? '<strong class="vf-refund-label">REFUND</strong> · '
          : ''}${esc(d.method)} · ${esc(d.student)}${d.parentName?' · Parent: '+esc(d.parentName):''}${d.className?' · '+esc(d.className):''}</div>
        </div>`
      ).join('')
    : '<div class="empty">No payments yet.</div>';

  const visibleCertificates=
    certs.filter(
      cert=>!cert.deleted
    );

  

  $$('[data-payment-id]')
    .forEach(record=>{

      const open=()=>{

        const payment=
          payments.find(
            item=>
              item.id===
              record.dataset.paymentId
          );


        if(payment){
          showPaymentDetail(payment);
        }
      };


      record.onclick=open;


      record.onkeydown=
        event=>{

          if(
            event.key==='Enter' ||
            event.key===' '
          ){
            event.preventDefault();
            open();
          }
        };
    });


$('#certificateList').innerHTML=
    visibleCertificates.length
    ? visibleCertificates.map(d=>
        `<div
          class="record vf-saved-certificate-record"
          data-certificate-id="${esc(d.id)}"
          role="button"
          tabindex="0"
          title="Open certificate and evidence">
          <strong>${esc(d.student)} — $${Number(d.amount).toFixed(2)}</strong>
          <div class="meta">${esc(d.school)} · ${esc(d.number)} · ${esc(d.status)}</div>

          ${
            d.invoiceReadyDate
              ? `<div class="vf-invoice-schedule ${
                    certificateIsInvoiceReady(d)
                      ? (
                          profile.invoiceNumberMode
                            ? 'vf-invoice-ready'
                            : 'vf-invoice-blocked'
                        )
                      : ''
                  }">
                   <strong>
                     ${
                       certificateIsInvoiceReady(d)
                         ? (
                             profile.invoiceNumberMode
                               ? 'Invoice ready'
                               : 'Cannot prepare invoice'
                           )
                         : 'Invoice scheduled'
                     }
                   </strong>
                   <span>
                     ${
                       certificateIsInvoiceReady(d) &&
                       !profile.invoiceNumberMode
                         ? 'Choose your invoice numbering system first.'
                         : (
                             `${esc(formatVendorDate(d.invoiceReadyDate))}${
                               Number.isFinite(Number(d.invoiceDaysAfterStart))
                                 ? ` · ${Number(d.invoiceDaysAfterStart)} day${
                                     Number(d.invoiceDaysAfterStart)===1?'':'s'
                                   } after service starts`
                                 : ''
                             }`
                           )
                     }
                   </span>
                 </div>`
              : (
                  certificateAttentionIssue(d)
                    ? `<button
                         type="button"
                         class="vf-invoice-schedule vf-invoice-unlinked vf-certificate-problem"
                         data-fix-certificate="${esc(d.id)}">
                         <strong>
                           ${esc(certificateAttentionIssue(d).title)}
                         </strong>
                         <span>
                           ${esc(certificateAttentionIssue(d).detail)}
                         </span>
                       </button>`
                    : ''
                )
          }

          <div class="vf-cert-actions">

            <button
              type="button"
              class="vf-cert-delete-button"
              data-delete-cert="${d.id}">
              Delete certificate
            </button>

          </div>

        </div>`
      ).join('')
    : '<div class="empty">No certificates yet.</div>';

  $$('[data-certificate-id]')
    .forEach(record=>{

      const open=()=>{

        openSavedCertificateEvidence(
          record.dataset.certificateId
        );
      };


      record.onclick=
        event=>{

          /*
           * Buttons inside the certificate remain their own actions.
           */
          if(
            event.target.closest(
              '[data-delete-cert], [data-fix-certificate]'
            )
          ){
            return;
          }

          open();
        };


      record.onkeydown=
        event=>{

          if(
            event.key!=='Enter' &&
            event.key!==' '
          ){
            return;
          }


          if(
            event.target.closest(
              '[data-delete-cert], [data-fix-certificate]'
            )
          ){
            return;
          }


          event.preventDefault();

          open();
        };
    });


  $$('[data-fix-certificate]')
    .forEach(button=>{

      button.onclick=()=>{

        openCertificateForRepair(
          button.dataset.fixCertificate
        );
      };
    });

  $$('[data-delete-cert]')
    .forEach(button=>{

      button.onclick=()=>{

        safeDeleteCertificate(
          button.dataset.deleteCert
        );
      };
    });

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


  const displayReviews=
    allNeedsReviewItems();


  if(!displayReviews.length){

    list.innerHTML=
      '<div class="empty">Nothing needs review.</div>';

    return;
  }


  list.innerHTML=
    displayReviews.map(review=>{


      if(
        review.reviewType===
        'invoice-numbering'
      ){

        return `
          <div class="record vf-numbering-review">

            <strong>
              ${esc(review.title)}
            </strong>

            <div class="meta">
              ${esc(review.detail)}
            </div>

            <div class="vf-review-actions">

              <button
                type="button"
                class="primary"
                data-open-numbering-review="${esc(review.certificateId)}">
                Choose invoice numbering
              </button>

            </div>

          </div>
        `;
      }




      if(
        review.reviewType!=='duplicate'
      ){

        const isCertificateAttention=
          review.reviewType===
            'certificate-attention' &&
          review.certificateId;


        return `
          <div class="record ${
            isCertificateAttention
              ? 'vf-certificate-review'
              : ''
          }">

            <strong>
              ${esc(review.title||'Needs review')}
            </strong>

            <div class="meta">
              ${esc(review.detail||'')}
            </div>

            ${
              isCertificateAttention
                ? `
                  <div class="vf-review-actions">
                    <button
                      type="button"
                      class="primary"
                      data-fix-review-certificate="${esc(review.certificateId)}">
                      Fix certificate
                    </button>
                  </div>
                `
                : ''
            }

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

            ${
              review.itemType==='certificate'
                ? `
                  <button
                    type="button"
                    class="primary"
                    data-compare-duplicate-certificate="${review.id}">
                    Compare certificates
                  </button>
                `
                : `
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
                `
            }

          </div>

          ${
            review.itemType==='certificate'
              ? `
                <div class="vf-default-note">
                  Review both original certificates before deciding.
                </div>
              `
              : `
                <div class="vf-default-note">
                  Default: reject duplicate
                </div>
              `
          }

        </div>
      `;
    }).join('');


  $$('[data-open-numbering-review]')
    .forEach(button=>{

      button.onclick=()=>{

        switchView(
          'invoices'
        );

        installInvoiceNumberingPopup();

        renderInvoiceNumberingSettings();

        const open=
          $('#openInvoiceNumberingSettings');

        if(open){
          open.click();
        }
      };
    });


  $$('[data-fix-review-certificate]')
    .forEach(button=>{

      button.onclick=()=>{

        openCertificateForRepair(
          button.dataset.fixReviewCertificate
        );
      };
    });


  $$('[data-compare-duplicate-certificate]')
    .forEach(button=>{

      button.onclick=()=>{

        openDuplicateCertificateCompare(
          button.dataset.compareDuplicateCertificate
        );
      };
    });


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

function historyCertificateEvidence(
  item
){

  const evidence=
    item?.evidence || {};


  /*
   * New actions: exact evidence ID.
   */
  if(
    evidence.type==='certificate' &&
    evidence.id
  ){

    return certs.find(
      cert=>
        cert.id===evidence.id
    ) || null;
  }


  const detail=
    String(
      item?.detail || ''
    );


  /*
   * Older actions often include the certificate / PO number.
   * This is the strongest legacy relationship.
   */
  const numberMatches=
    certs.filter(
      cert=>
        cert.number &&
        detail.includes(
          String(cert.number)
        )
    );


  if(numberMatches.length===1){

    return numberMatches[0];
  }


  /*
   * Older "Certificate added" actions created before evidence
   * IDs often contain:
   *
   * charter + student + dollar amount.
   *
   * Resolve only when that combination identifies ONE record.
   */
  if(
    String(
      item?.action || ''
    )
      .toLowerCase()
      .includes('certificate')
  ){

    const lowerDetail=
      detail.toLowerCase();


    let candidates=
      certs.filter(
        cert=>{

          const student=
            String(
              cert.student || ''
            ).trim();


          if(
            !student ||
            !lowerDetail.includes(
              student.toLowerCase()
            )
          ){
            return false;
          }


          const amountText=
            money(
              Number(
                cert.amount || 0
              )
            );


          return (
            amountText &&
            detail.includes(
              amountText
            )
          );
        }
      );


    if(candidates.length>1){

      const charterFiltered=
        candidates.filter(
          cert=>{

            const charter=
              String(
                cert.charterSchoolName ||
                cert.school ||
                ''
              ).trim();


            return (
              charter &&
              lowerDetail.includes(
                charter.toLowerCase()
              )
            );
          }
        );


      if(charterFiltered.length){

        candidates=
          charterFiltered;
      }
    }


    if(candidates.length===1){

      return candidates[0];
    }
  }


  /*
   * Ambiguous history never guesses.
   */
  return null;
}



function historyInvoiceEvidence(
  item
){

  const evidence=
    item?.evidence || {};


  /*
   * New history entries have an exact invoice ID.
   */
  if(
    evidence.type==='invoice' &&
    evidence.id
  ){

    return invoices.find(
      invoice=>
        invoice.id===evidence.id
    ) || null;
  }


  /*
   * Older invoice history predates structured evidence.
   * Invoice numbers are designed to be unique, so resolve
   * only when exactly one current invoice matches.
   */
  const detail=
    String(
      item?.detail || ''
    );


  if(
    !String(
      item?.action || ''
    )
      .toLowerCase()
      .includes('invoice')
  ){
    return null;
  }


  const matches=
    invoices.filter(
      invoice=>
        invoice.invoiceNumber &&
        detail.includes(
          String(
            invoice.invoiceNumber
          )
        )
    );


  return matches.length===1
    ? matches[0]
    : null;
}



function historyPaymentEvidence(
  item
){

  const evidence=
    item?.evidence || {};


  if(
    evidence.type==='payment' &&
    evidence.id
  ){

    return payments.find(
      payment=>
        payment.id===evidence.id
    ) || null;
  }


  const action=
    String(
      item?.action || ''
    ).toLowerCase();


  if(
    !action.includes('payment') &&
    !action.includes('refund')
  ){
    return null;
  }


  /*
   * Legacy History has no payment ID.
   * Resolve conservatively from saved data and ONLY when
   * exactly one payment matches.
   */
  const detail=
    String(
      item?.detail || ''
    );

  const lower=
    detail.toLowerCase();


  const candidates=
    payments.filter(
      payment=>{

        const amountText=
          money(
            Math.abs(
              Number(
                payment.amount || 0
              )
            )
          );


        if(
          !amountText ||
          !detail.includes(amountText)
        ){
          return false;
        }


        const student=
          String(
            payment.student || ''
          ).trim();


        if(
          student &&
          !lower.includes(
            student.toLowerCase()
          )
        ){
          return false;
        }


        const method=
          String(
            payment.method || ''
          ).trim();


        if(
          method &&
          !lower.includes(
            method.toLowerCase()
          )
        ){
          return false;
        }


        if(
          action.includes('refund') &&
          !(
            String(
              payment.transactionType || ''
            )
              .toLowerCase()==='refund' ||
            Number(payment.amount)<0
          )
        ){
          return false;
        }


        return true;
      }
    );


  return candidates.length===1
    ? candidates[0]
    : null;
}


function openHistoryEvidence(
  historyId
){

  const item=
    history.find(
      entry=>
        entry.id===historyId
    );


  if(!item){
    return;
  }


  const certificate=
    historyCertificateEvidence(
      item
    );


  if(certificate){

    openSavedCertificateEvidence(
      certificate.id
    );

    return;
  }


  const invoice=
    historyInvoiceEvidence(
      item
    );


  if(invoice){

    showInvoiceLedgerDetail(
      invoice
    );

    return;
  }


  const payment=
    historyPaymentEvidence(
      item
    );


  if(payment){

    showPaymentDetail(
      payment
    );

    return;
  }


  /*
   * Every action remains inspectable even if an older record
   * has no document attached to it.
   */
  alert(
    `${item.action || 'VendorFlow action'}\n\n` +
    `${item.detail || 'No additional details were recorded.'}\n\n` +
    `Source: ${item.source || 'VendorFlow'}\n` +
    `Date: ${date(item.createdAt)}`
  );
}


function renderHistoryInto(
  el,
  list
){

  el.innerHTML=
    list.length
      ? list.map(
          item=>`
            <button
              type="button"
              class="history vf-history-evidence"
              data-history-evidence="${esc(item.id)}"
              title="Open action details">

              <span>
                ${esc(date(item.createdAt))}
              </span>

              <div>
                <small>
                  ${esc(item.source)}
                </small>

                <strong>
                  ${esc(item.action)}
                </strong>

                <div class="meta">
                  ${esc(item.detail)}
                </div>
              </div>

            </button>
          `
        ).join('')
      : '<div class="empty">No history yet.</div>';


  $$('[data-history-evidence]')
    .forEach(
      button=>{

        button.onclick=()=>{

          openHistoryEvidence(
            button.dataset.historyEvidence
          );
        };
      }
    );
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

  const address=
    vendorAddressParts();

  $('#pBusiness').value=
    profile.businessName||'';

  $('#pOwner').value=
    profile.ownerName||'';

  $('#pAddress').value=
    address.street;

  $('#pCity').value=
    address.city;

  $('#pState').value=
    address.state;

  $('#pZip').value=
    address.zip;

  $('#pPhone').value=
    profile.phone||'';

  $('#pLocations').value=
    profile.locations||'';

  $('#pSchools').value=
    profile.schools||'';
}


$('#saveProfile').onclick=async()=>{
  let d={
    businessName:$('#pBusiness').value.trim(),
    ownerName:$('#pOwner').value.trim(),
    address:$('#pAddress').value.trim(),
    city:$('#pCity').value.trim(),
    state:$('#pState').value.trim(),
    zip:$('#pZip').value.trim(),

    cityStateZip:[
      $('#pCity').value.trim(),
      [
        $('#pState').value.trim(),
        $('#pZip').value.trim()
      ]
        .filter(Boolean)
        .join(' ')
    ]
      .filter(Boolean)
      .join(', '),

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
    charters:'Charter Schools',
    students:'Students & Services',
    payments:'Payments',
    certificates:'Certificates',
    invoices:'Invoices',
    compliance:'Compliance',
    review:'Needs Review',
    history:'History',
    account:'Account',
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


/* ==========================================================
   ACCOUNT PAGE
   ========================================================== */

if($('#accountSummary')){

  $('#accountSummary').onclick=(event)=>{

    /*
     * Log out remains its own action.
     */
    if(
      event.target.closest(
        '#logout'
      )
    ){
      return;
    }

    renderAccountPage();

    switchView(
      'account'
    );
  };
}


if($('#accountEditBusiness')){

  $('#accountEditBusiness').onclick=()=>{

    switchView(
      'profile'
    );
  };
}


if($('#accountResetPassword')){

  $('#accountResetPassword').onclick=async()=>{

    const email=
      user?.email || '';

    if(!email){

      return toast(
        'No login email is available.'
      );
    }


    const ok=
      confirm(
        `Send a password-reset email to ${email}?`
      );

    if(!ok){
      return;
    }


    try{

      await sendPasswordResetEmail(
        auth,
        email
      );

      alert(
        `VendorFlow sent a password-reset email to ${email}.`
      );

    }catch(error){

      alert(
        'VendorFlow could not send the password-reset email. ' +
        (error?.message || '')
      );
    }
  };
}




if($('#saveAccountInfo')){

  $('#saveAccountInfo').onclick=async()=>{

    const businessName=
      $('#accountBusinessInput')
        .value
        .trim();

    const ownerName=
      $('#accountOwnerInput')
        .value
        .trim();

    const address=
      $('#accountStreetInput')
        .value
        .trim();

    const city=
      $('#accountCityInput')
        .value
        .trim();

    const state=
      $('#accountStateInput')
        .value
        .trim();

    const zip=
      $('#accountZipInput')
        .value
        .trim();

    const phone=
      $('#accountPhoneInput')
        .value
        .trim();


    const cityStateZip=
      [
        city,
        [
          state,
          zip
        ]
          .filter(Boolean)
          .join(' ')
      ]
        .filter(Boolean)
        .join(', ');


    const data={

      businessName,
      ownerName,
      address,
      city,
      state,
      zip,
      cityStateZip,
      phone,

      updatedAt:
        serverTimestamp()
    };


    await setDoc(
      vendorDoc(),
      data,
      {
        merge:true
      }
    );


    profile={
      ...profile,
      ...data
    };


    $('#bizNameSide').textContent=
      businessName ||
      'VendorFlow';


    fillProfile();

    renderAccountPage();


    await log(
      'Account information updated',
      'Vendor and business contact information was updated.',
      'Manual'
    );


    toast(
      'Account information saved.'
    );
  };
}



/* ==========================================================
   CHARTER SCHOOL CONTROLS
   ========================================================== */

$('#addCharterSchool').onclick=()=>{

  openCharterEditor();
};


$('#cancelCharterEdit').onclick=()=>{

  resetCharterForm();

  hide(
    $('#charterForm')
  );
};


$('#showArchivedCharters').onclick=()=>{

  renderArchivedCharterSchools();

  show(
    $('#archivedCharterPanel')
  );
};


$('#closeArchivedCharters').onclick=()=>{

  hide(
    $('#archivedCharterPanel')
  );
};


$('#saveCharterSchool').onclick=async()=>{

  const name=
    $('#charterName')
      .value
      .trim();

  if(!name){

    return toast(
      'Enter the charter school name.'
    );
  }


  const invoiceDays=
    Math.max(
      0,
      Math.min(
        365,
        Math.round(
          Number(
            $('#charterInvoiceDays').value
          )||0
        )
      )
    );


  const data={

    name,

    billingEmail:
      $('#charterBillingEmail')
        .value
        .trim(),

    phone:
      $('#charterPhone')
        .value
        .trim(),

    contactName:
      $('#charterContactName')
        .value
        .trim(),

    contactEmail:
      $('#charterContactEmail')
        .value
        .trim(),

    address:
      $('#charterAddress')
        .value
        .trim(),

    city:
      $('#charterCity')
        .value
        .trim(),

    state:
      $('#charterState')
        .value
        .trim(),

    zip:
      $('#charterZip')
        .value
        .trim(),

    invoiceDaysAfterStart:
      invoiceDays,

    notes:
      $('#charterNotes')
        .value
        .trim(),

    archived:false,

    updatedAt:
      serverTimestamp()
  };


  if(editingCharterSchoolId){

    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'charterSchools',
        editingCharterSchoolId
      ),
      data,
      {
        merge:true
      }
    );

    await log(
      'Charter school updated',
      name,
      'Manual'
    );

    toast(
      'Charter school updated.'
    );


  }else{

    const duplicate=
      charterSchools.find(
        charter=>
          !charter.archived &&
          String(charter.name||'')
            .trim()
            .toLowerCase()===
          name.toLowerCase()
      );

    if(duplicate){

      return toast(
        'That charter school is already in your list.'
      );
    }

    const newCharterRef=
      await addDoc(
        sub('charterSchools'),
        {
          ...data,
          createdAt:
            serverTimestamp()
        }
      );

    const newlyAddedCharter={
      id:newCharterRef.id,
      ...data
    };

    await log(
      'Charter school added',
      name,
      'Manual'
    );

    toast(
      'Charter school added.'
    );
  }


  const pendingCertificateFlow=
    sessionStorage.getItem(
      'vendorflowPendingCertificateCharter'
    );

  const savedCharterId=
    editingCharterSchoolId ||
    (
      typeof newlyAddedCharter!=='undefined'
        ? newlyAddedCharter.id
        : ''
    );


  resetCharterForm();

  hide(
    $('#charterForm')
  );

  await refreshAll();


  if(
    pendingCertificateFlow &&
    savedCharterId
  ){

    const savedCharter=
      charterSchools.find(
        charter=>
          charter.id===savedCharterId
      );

    if(savedCharter){

      restorePendingCertificateAfterCharterSave(
        savedCharter
      );
    }
  }
};




/* ==========================================================
   INVOICE NUMBERING SETTINGS
   ========================================================== */

if($('#invoiceNumberAuto')){

  $('#invoiceNumberAuto')
    .addEventListener(
      'change',
      updateInvoiceNumberingUI
    );
}


if($('#invoiceNumberCustom')){

  $('#invoiceNumberCustom')
    .addEventListener(
      'change',
      updateInvoiceNumberingUI
    );
}


if($('#invoiceNumberNext')){

  $('#invoiceNumberNext')
    .addEventListener(
      'input',
      updateInvoiceNumberingUI
    );
}


if($('#saveInvoiceNumbering')){

  $('#saveInvoiceNumbering').onclick=
    async()=>{


      const mode=
        $('#invoiceNumberCustom').checked
          ? 'custom'
          : (
              $('#invoiceNumberAuto').checked
                ? 'auto'
                : ''
            );


      if(!mode){

        return toast(
          'Choose an invoice numbering option.'
        );
      }


      let next='';


      if(mode==='custom'){

        next=
          $('#invoiceNumberNext')
            .value
            .trim();


        if(
          !invoiceNumberSequenceValid(
            next
          )
        ){

          return toast(
            'Enter the next invoice number VendorFlow should use.'
          );
        }


        const alreadyUsed=
          invoices.some(
            invoice=>
              String(
                invoice.invoiceNumber||''
              )===next
          );


        if(alreadyUsed){

          return toast(
            'That invoice number is already used in VendorFlow.'
          );
        }
      }


      const data={

        invoiceNumberMode:
          mode,

        invoiceNumberNext:
          mode==='custom'
            ? next
            : '',

        invoiceNumberConfiguredAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      };


      await setDoc(
        vendorDoc(),
        data,
        {
          merge:true
        }
      );


      profile={
        ...profile,
        ...data
      };


      await log(
        'Invoice numbering updated',
        mode==='custom'
          ? `VendorFlow will continue with invoice ${next}.`
          : 'VendorFlow will number future invoices automatically.',
        'Manual'
      );


      toast(
        'Invoice numbering saved.'
      );


      /*
       * Saving is complete. Close the settings popup so the
       * vendor gets an unmistakable visual confirmation.
       */
      const numberingModal=
        $('#invoiceNumberingModal');

      if(numberingModal){
        hide(numberingModal);
      }


      /*
       * Refresh immediately. If certificates have already
       * reached their billing date, VendorFlow will now
       * prepare those invoices automatically.
       */
      await refreshAll();


      renderInvoiceNumberingSettings();
    };
}



installVendorFlowBranding();setAuthMode('login');


/* ==========================================================
   BULK CERTIFICATE INTAKE
   ----------------------------------------------------------
   This intentionally reuses the proven single-PDF extraction
   service. It does NOT create certificates automatically yet.
   The first foundation pass reads each PDF and prepares a
   reviewable batch without changing financial records.
   ========================================================== */

let bulkCertificateItems=[];




function showCertificateImportConfirmation(
  message='',
  action=''
){

  const box=
    $('#certificateImportConfirmation');

  if(!box){
    return;
  }


  const text=
    String(
      message || ''
    ).trim();


  box.textContent=
    text;


  box.dataset.action=
    String(
      action || ''
    );


  box.classList.toggle(
    'vf-certificate-import-confirmation-clickable',
    Boolean(
      text &&
      action
    )
  );


  box.classList.toggle(
    'hidden',
    !text
  );
}



if($('#certificateImportConfirmation')){

  $('#certificateImportConfirmation')
    .addEventListener(
      'click',
      ()=>{

        const box=
          $('#certificateImportConfirmation');


        const action=
          box?.dataset.action || '';


        if(action==='needs-review-page'){

          switchView(
            'review'
          );

          return;
        }


        if(action==='batch-review'){

          const item=
            bulkCertificateItems.find(
              entry=>
                entry.state==='review' ||
                entry.state==='ready'
            );


          if(item){

            openBulkCertificateReview(
              item.id
            );
          }
        }
      }
    );
}


function vendorReviewsCertificatesBeforeImport(){

  /*
   * Default ON for every vendor unless they explicitly
   * turn the preference off.
   */
  return (
    profile?.reviewCertificatesBeforeImport !== false
  );
}


function renderCertificateReviewPreference(){

  const input=
    $('#reviewCertificatesBeforeImport');

  if(!input){
    return;
  }


  input.checked=
    vendorReviewsCertificatesBeforeImport();
}


async function saveCertificateReviewPreference(){

  const input=
    $('#reviewCertificatesBeforeImport');

  if(!input || !user){
    return;
  }


  const enabled=
    Boolean(
      input.checked
    );


  try{

    await setDoc(
      vendorDoc(),
      {
        reviewCertificatesBeforeImport:
          enabled,

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    profile={
      ...profile,

      reviewCertificatesBeforeImport:
        enabled
    };


    renderBulkCertificateItems();

    showCertificateImportConfirmation('');


    toast(
      enabled
        ? 'Certificate review is on.'
        : 'Certificate review is off. VendorFlow will import certificates it can verify safely.'
    );


    /*
     * If the vendor turns review OFF while a batch is already
     * waiting, immediately finalize only the certificates that
     * meet the stricter automatic-import rules.
     */
    if(
      !enabled &&
      bulkCertificateItems.length
    ){

      await importReadyBulkCertificates({
        automatic:true
      });
    }


  }catch(error){

    console.error(
      'Could not save certificate review preference:',
      error
    );


    input.checked=
      vendorReviewsCertificatesBeforeImport();


    toast(
      'VendorFlow could not save that preference.'
    );
  }
}


if($('#reviewCertificatesBeforeImport')){

  $('#reviewCertificatesBeforeImport')
    .addEventListener(
      'change',
      saveCertificateReviewPreference
    );
}


function bulkCertificateItemId(){

  return (
    'bulk-cert-' +
    Date.now() +
    '-' +
    Math.random()
      .toString(36)
      .slice(2,9)
  );
}


function resetBulkCertificateIntake(){

  bulkCertificateItems=[];

  const input=
    $('#bulkCertificateFiles');

  if(input){
    input.value='';
  }

  const list=
    $('#bulkCertificateList');

  if(list){
    list.innerHTML='';
  }

  const status=
    $('#bulkCertificateStatus');

  if(status){
    status.textContent='';
  }

  updateBulkCertificateSummary();

  hide(
    $('#bulkCertificateWorkspace')
  );
}


function updateBulkCertificateSummary(){

  const total=
    bulkCertificateItems.length;

  const ready=
    bulkCertificateItems.filter(
      item=>item.state==='ready'
    ).length;

  const review=
    bulkCertificateItems.filter(
      item=>item.state==='review'
    ).length;

  const errors=
    bulkCertificateItems.filter(
      item=>item.state==='error'
    ).length;


  if($('#bulkCertificateCount')){
    $('#bulkCertificateCount').textContent=
      String(total);
  }

  if($('#bulkCertificateReadyCount')){
    $('#bulkCertificateReadyCount').textContent=
      String(ready);
  }

  if($('#bulkCertificateReviewCount')){
    $('#bulkCertificateReviewCount').textContent=
      String(review);
  }

  if($('#bulkCertificateErrorCount')){
    $('#bulkCertificateErrorCount').textContent=
      String(errors);
  }
}



function exactBulkCertificateStudent(
  name
){

  const target=
    normalizedName(
      name || ''
    );

  if(!target){
    return null;
  }


  const matches=
    students.filter(
      student=>
        normalizedName(
          student.studentName || ''
        )===target
    );


  return matches.length===1
    ? matches[0]
    : null;
}



function bulkCertificateExistingDuplicate(
  item
){

  const x=
    bulkCertificateVendorExtraction(
      item
    );


  const number=
    String(
      x.certificateNumber ||
      x.purchaseOrderNumber ||
      ''
    ).trim();


  if(!number){
    return null;
  }


  return findDuplicateCertificate({
    number
  });
}


function bulkCertificateImportReadiness(
  item,
  options={}
){

  const automatic=
    Boolean(
      options.automatic
    );


  const x=
    bulkCertificateVendorExtraction(
      item
    );


  const student=
    exactBulkCertificateStudent(
      x.studentName ||
      x.student ||
      x.learnerName ||
      ''
    );


  const extractedCharterName=
    String(
      x.charterSchool ||
      x.charterSchoolName ||
      x.schoolName ||
      x.school ||
      ''
    ).trim();


  const charterResolution=
    resolveSavedCharterMatch(
      extractedCharterName
    );


  const charter=
    charterResolution.charter;


  const amount=
    Number(
      x.amount ||
      x.certificateAmount ||
      0
    );


  const number=
    String(
      x.certificateNumber ||
      x.purchaseOrderNumber ||
      ''
    ).trim();


  const serviceStartDate=
    String(
      x.serviceStartDate ||
      ''
    ).trim();


  /*
   * Automatic importing is deliberately stricter.
   *
   * It may use only a clean VendorFlow "ready" result.
   * A Needs Review item never slips through automatically.
   */
  const reviewed=
    automatic
      ? item.state==='ready'
      : (
          item.vendorEdited ||
          item.vendorApproved
        );


  const problems=[];


  if(!reviewed){

    problems.push(
      automatic
        ? 'VendorFlow flagged this certificate for review.'
        : 'Open this certificate and either save a correction or choose Looks correct before importing.'
    );
  }


  if(!student){

    problems.push(
      'Student does not exactly match one saved VendorFlow student.'
    );
  }


  if(!charter){

    if(
      charterResolution.candidates.length
    ){

      problems.push(
        'Charter school needs matching.'
      );

    }else{

      problems.push(
        `No saved charter school matches “${extractedCharterName || 'the extracted school name'}”.`
      );
    }
  }


  if(!(amount>0)){

    problems.push(
      'Certificate amount is missing.'
    );
  }


  if(!number){

    problems.push(
      'Certificate / PO number is missing.'
    );
  }


  if(!item?.result?.objectKey){

    problems.push(
      'Original PDF is not securely stored.'
    );
  }


  if(!serviceStartDate){

    problems.push(
      'Service start date is required.'
    );
  }


  return {

    ready:
      problems.length===0,

    problems,

    student,

    charter,

    charterResolution,

    extractedCharterName,

    extraction:x,

    amount,

    number,

    serviceStartDate
  };
}


function bulkCertificateImportableItems(
  options={}
){

  return bulkCertificateItems.filter(
    item=>
      bulkCertificateImportReadiness(
        item,
        options
      ).ready
  );
}


function updateBulkCertificateImportButton(){

  const button=
    $('#importReadyCertificates');

  if(!button){
    return;
  }


  const count=
    bulkCertificateImportableItems()
      .length;


  const manualReview=
    vendorReviewsCertificatesBeforeImport();


  button.classList.toggle(
    'hidden',
    !manualReview
  );


  button.disabled=
    count===0;


  button.textContent=
    count
      ? `Import ${count} ready certificate${count===1?'':'s'}`
      : 'Import ready certificates';
}


function bulkCertificateStateLabel(item){

  if(item.state==='reading'){
    return 'Reading PDF…';
  }

  if(item.state==='ready'){
    return 'Read successfully';
  }

  if(item.state==='review'){
    return 'Needs review';
  }

  if(item.state==='error'){
    return 'Could not read';
  }

  if(item.state==='imported'){
    return 'Imported';
  }

  return 'Waiting';
}


function renderBulkCertificateItems(){

  const list=
    $('#bulkCertificateList');

  if(!list){
    return;
  }

  list.innerHTML='';


  for(const item of bulkCertificateItems){

    const row=
      document.createElement('div');

    row.className=
      'vf-bulk-item ' +
      `vf-bulk-item-${item.state}`;

    row.dataset.bulkCertificateReview=
      item.id;

    row.setAttribute(
      'role',
      'button'
    );

    row.setAttribute(
      'tabindex',
      '0'
    );

    row.setAttribute(
      'title',
      'Click to review VendorFlow’s certificate details'
    );


    const extraction=
      item.result?.extraction || {};


    const student=
      extraction.studentName ||
      extraction.student ||
      extraction.learnerName ||
      '';


    const school=
      extraction.charterSchool ||
      extraction.charterSchoolName ||
      extraction.school ||
      '';


    const amount=
      Number(
        extraction.amount ||
        extraction.certificateAmount ||
        0
      );


    const reference=
      extraction.certificateNumber ||
      extraction.purchaseOrderNumber ||
      '';


    const serviceDates=
      [
        extraction.serviceStartDate,
        extraction.serviceEndDate
      ]
        .filter(Boolean)
        .join(' – ');


    row.innerHTML=`
      <div class="vf-bulk-item-main">

        <div class="vf-bulk-file-name">
          ${esc(item.file.name)}
        </div>

        <div class="vf-bulk-item-details">

          ${
            student
              ? `<span>${esc(student)}</span>`
              : ''
          }

          ${
            school
              ? `<span>${esc(school)}</span>`
              : ''
          }

          ${
            amount
              ? `<span>${money(amount)}</span>`
              : ''
          }

          ${
            reference
              ? `<span>#${esc(reference)}</span>`
              : ''
          }

          ${
            serviceDates
              ? `<span>${esc(serviceDates)}</span>`
              : ''
          }

        </div>

        <div class="vf-bulk-review-hint">
          Click to check details
        </div>

      </div>

      <div class="vf-bulk-item-state">
        ${esc(bulkCertificateStateLabel(item))}
      </div>
    `;


    if(item.message){

      const message=
        document.createElement('div');

      message.className=
        'vf-bulk-item-message';

      message.textContent=
        item.message;

      row.appendChild(message);
    }


    list.appendChild(row);
  }


  updateBulkCertificateSummary();

  updateBulkCertificateImportButton();

  wireBulkCertificateReviewRows();
}


async function readOneBulkCertificate(item){

  item.state='reading';
  item.message='';
  item.result=null;

  renderBulkCertificateItems();


  let uploaded=null;


  try{

    /*
     * Follow the SAME proven pipeline as the existing
     * single-certificate workflow:
     *
     * 1. Securely upload the PDF.
     * 2. Read the stored PDF using its object key.
     * 3. Run the same client validation.
     *
     * Nothing is saved as a certificate here.
     */

    uploaded=
      await uploadCertificatePdf(
        item.file
      );


    /*
     * Keep the successful upload information immediately.
     * If extraction fails, the batch still knows that the
     * original PDF made it safely into secure storage.
     */
    item.result={
      ...uploaded,
      extraction:null,
      clientValidation:null,
      sourceTextLength:0
    };


    renderBulkCertificateItems();


    const extracted=
      await extractCertificatePdf(
        uploaded.objectKey
      );


    const extraction=
      extracted?.extraction || {};


    const clientValidation=
      validateExtractedCertificate(
        extracted
      );


    item.result={
      ...uploaded,
      extraction,
      clientValidation,
      sourceTextLength:
        Number(
          extracted?.sourceTextLength || 0
        )
    };


    /*
     * The existing validator is the authority here.
     * We do not invent a separate bulk validation system.
     */
    const validationNeedsReview=
      Boolean(
        clientValidation?.needsReview
      );


    const extractionNeedsReview=
      Boolean(
        extraction?.needsReview
      );


    const confidence=
      Number(
        extraction?.confidence || 0
      );


    if(
      validationNeedsReview ||
      extractionNeedsReview ||
      (
        confidence>0 &&
        confidence<0.75
      )
    ){

      item.state='review';

      item.message=
        'VendorFlow read this certificate, but it should be checked before importing.';

    }else{

      item.state='ready';

      item.message=
        'Certificate read successfully.';
    }


  }catch(error){

    console.error(
      'Bulk certificate read failed:',
      error
    );


    if(uploaded?.objectKey){

      /*
       * Match the behavior of the working single-file form:
       * upload success is not treated the same as upload failure.
       */
      item.state='review';

      item.result={
        ...(item.result || uploaded)
      };

      item.message=
        'PDF stored securely, but VendorFlow could not confidently read it. Review it before importing.';

    }else{

      item.state='error';

      item.message=
        error?.message ||
        'VendorFlow could not upload this PDF.';
    }
  }


  renderBulkCertificateItems();
}

async function processBulkCertificateBatch(){

  const button=
    $('#startBulkCertificates');

  if(!bulkCertificateItems.length){
    return;
  }


  if(button){
    button.disabled=true;
    button.textContent=
      'Reading certificates…';
  }


  const status=
    $('#bulkCertificateStatus');

  if(status){
    status.textContent=
      'VendorFlow is reading the certificates one at a time.';
  }


  /*
   * Sequential on purpose.
   *
   * This protects the existing upload/extraction service from a
   * sudden burst of simultaneous historical PDFs and makes the
   * batch easier to recover if one individual file fails.
   */
  for(
    let index=0;
    index<bulkCertificateItems.length;
    index++
  ){

    const item=
      bulkCertificateItems[index];


    if(
      item.state==='ready' ||
      item.state==='review'
    ){
      continue;
    }


    if(status){

      status.textContent=
        `Reading certificate ${index+1} of ${bulkCertificateItems.length}…`;
    }


    await readOneBulkCertificate(
      item
    );
  }


  if(button){
    button.disabled=false;
    button.textContent=
      'Read certificates';
  }


  const ready=
    bulkCertificateItems.filter(
      item=>item.state==='ready'
    ).length;

  const review=
    bulkCertificateItems.filter(
      item=>item.state==='review'
    ).length;

  const errors=
    bulkCertificateItems.filter(
      item=>item.state==='error'
    ).length;


  if(status){

    status.textContent=
      `${ready} read successfully` +
      `${review ? ` · ${review} need review` : ''}` +
      `${errors ? ` · ${errors} could not be read` : ''}. ` +
      (
        vendorReviewsCertificatesBeforeImport()
          ? `Nothing has been added to the account yet.`
          : `VendorFlow is finalizing certificates it can verify safely.`
      );
  }


  /*
   * Detect known duplicate certificate numbers BEFORE asking
   * the vendor to review/import them.
   *
   * A duplicate belongs in Needs Review, not in the normal
   * certificate-import flow.
   */
  const duplicateItems=
    bulkCertificateItems.filter(
      item=>
        item.state==='ready' &&
        Boolean(
          bulkCertificateExistingDuplicate(
            item
          )
        )
    );


  for(const duplicateItem of duplicateItems){

    await importReadyBulkCertificates({
      automatic:true,
      onlyItemId:
        duplicateItem.id,
      skipConfirmation:true
    });
  }


  /*
   * REVIEW ON:
   * The vendor already asked to review every certificate.
   * Open the first remaining certificate automatically.
   */
  if(
    vendorReviewsCertificatesBeforeImport()
  ){

    const nextItem=
      bulkCertificateItems.find(
        item=>
          item.state==='ready' ||
          item.state==='review'
      );


    if(nextItem){

      openBulkCertificateReview(
        nextItem.id
      );

    }else if(duplicateItems.length){

      showCertificateImportConfirmation(
        `${duplicateItems.length} possible duplicate` +
        `${duplicateItems.length===1?'':'s'} sent to Needs Review. ` +
        `Click to review.`,
        'needs-review-page'
      );
    }


    return;
  }


  /*
   * REVIEW OFF:
   * Only clean Ready items with exact/safe matches and all
   * required information are eligible for automatic import.
   */
  if(
    !vendorReviewsCertificatesBeforeImport()
  ){

    await importReadyBulkCertificates({
      automatic:true
    });


    /*
     * Automatic import must never fail silently.
     *
     * Anything still sitting in Ready state after the automatic
     * pass did not qualify for import. Convert it to Needs Review
     * and display the actual reason.
     */
    for(const item of bulkCertificateItems){

      if(item.state!=='ready'){
        continue;
      }


      const readiness=
        bulkCertificateImportReadiness(
          item,
          {
            automatic:true
          }
        );


      if(!readiness.ready){

        item.state='review';

        item.message=
          readiness.problems.join(' ');
      }
    }


    renderBulkCertificateItems();


    const remaining=
      bulkCertificateItems.length;


    if(remaining){

      const status=
        $('#bulkCertificateStatus');


      if(status){

        status.textContent=
          `${remaining} certificate` +
          `${remaining===1?'':'s'} need attention before importing.`;
      }


      showCertificateImportConfirmation(
        `${remaining} certificate` +
        `${remaining===1?'':'s'} need attention. ` +
        `Click to review.`,
        'batch-review'
      );
    }
  }
}



async function importReadyBulkCertificates(
  options={}
){

  const automatic=
    Boolean(
      options.automatic
    );

  const onlyItemId=
    String(
      options.onlyItemId || ''
    ).trim();

  const skipConfirmation=
    Boolean(
      options.skipConfirmation
    );


  const button=
    $('#importReadyCertificates');

  const status=
    $('#bulkCertificateStatus');


  const candidates=
    bulkCertificateImportableItems({
      automatic
    }).filter(
      item=>
        !onlyItemId ||
        item.id===onlyItemId
    );


  if(!candidates.length){

    if(!automatic){

      toast(
        'No certificates are ready to import yet.'
      );
    }

    return {
      imported:0,
      duplicates:0,
      skipped:0
    };
  }


  if(
    !automatic &&
    !skipConfirmation
  ){

    const ok=
      confirm(
        `Import ${candidates.length} ready certificate` +
        `${candidates.length===1?'':'s'}?\n\n` +
        `VendorFlow will add these certificate records now.\n\n` +
        `Possible duplicates will be sent to Needs Review instead of being imported twice.`
      );


    if(!ok){
      return {
        imported:0,
        duplicates:0,
        skipped:0
      };
    }
  }


  if(button){

    button.disabled=true;

    button.textContent=
      automatic
        ? 'Finalizing certificates…'
        : 'Importing certificates…';
  }


  let imported=0;
  let duplicates=0;
  let skipped=0;


  try{

    for(
      let index=0;
      index<candidates.length;
      index++
    ){

      const item=
        candidates[index];


      const readiness=
        bulkCertificateImportReadiness(
          item,
          {
            automatic
          }
        );


      /*
       * Re-check immediately before every Firestore write.
       */
      if(!readiness.ready){

        item.state='review';

        item.message=
          readiness.problems.join(' ');

        skipped++;

        continue;
      }


      const {
        student,
        charter,
        charterResolution,
        extractedCharterName,
        extraction:x,
        amount,
        number,
        serviceStartDate
      }=readiness;


      const invoiceSchedule=
        certificateInvoiceSchedule(
          serviceStartDate,
          charter,
          student?.id || ''
        );


      const materialsFee=
        Math.max(
          0,
          Number(
            x.materialsFee || 0
          )
        );


      const serviceAmount=
        Math.max(
          0,
          Number(
            x.serviceAmount ||
            Math.max(
              0,
              amount-materialsFee
            )
          )
        );


      const data={

        studentId:
          student.id,

        student:
          student.studentName ||
          String(
            x.studentName || ''
          ).trim(),

        parentName:
          student.parentName || '',

        parentEmail:
          student.parentEmail || '',


        school:
          charter.name,

        charterSchoolId:
          charter.id,

        charterSchoolName:
          charter.name,

        charterMatched:
          true,

        charterBillingEmail:
          charter.billingEmail || '',

        charterAddress:
          charter.address || '',

        charterCity:
          charter.city || '',

        charterState:
          charter.state || '',

        charterZip:
          charter.zip || '',


        serviceAmount,

        materialsFee,

        amount,

        number,

        status:
          'Received - Not Billed',

        source:
          automatic
            ? 'Automatic PDF import'
            : 'Bulk PDF import',

        matchedBy:
          'Exact student + charter match',


        pdfObjectKey:
          item.result?.objectKey || '',

        pdfName:
          item.result?.originalName ||
          item.file?.name ||
          '',

        pdfSize:
          Number(
            item.result?.size ||
            item.file?.size ||
            0
          ),

        pdfStored:
          Boolean(
            item.result?.objectKey
          ),


        issueDate:
          String(
            x.issueDate || ''
          ).trim(),

        serviceStartDate,

        serviceEndDate:
          String(
            x.serviceEndDate || ''
          ).trim(),

        serviceDescription:
          String(
            x.serviceDescription || ''
          ).trim(),

        billingEmail:
          String(
            x.billingEmail ||
            charter.billingEmail ||
            ''
          ).trim(),

        invoiceInstructions:
          String(
            x.invoiceInstructions || ''
          ).trim(),


        invoiceDaysAfterStart:
          invoiceSchedule.days,

        paymentTermsDays:
          invoicePaymentTermsDays(
            charter.paymentTermsDays
          ),

        invoiceReadyDate:
          invoiceSchedule.readyDate,

        invoiceScheduleValid:
          Boolean(
            invoiceSchedule.valid
          ),

        invoiceScheduleSource:
          invoiceSchedule.source || '',

        tutoringClassId:
          invoiceSchedule.tutoringClassId || '',

        tutoringClassName:
          invoiceSchedule.tutoringClassName || '',


        notes:'',

        extraction:{
          ...x
        },

        extractionConfidence:
          Number(
            x.confidence || 0
          ),

        extractionNeedsReview:
          false,


        bulkImported:
          true,

        automaticallyImported:
          automatic,

        vendorReviewed:
          Boolean(
            item.vendorEdited ||
            item.vendorApproved
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
         * This PDF is not an importable pending certificate anymore.
         * It now lives in the real Needs Review queue.
         */
        item.state='duplicate';

        item.duplicateQueued=true;

        item.message=
          'Possible duplicate — sent to Needs Review.';

        duplicates++;

        continue;
      }


      const importedCertificateRef=
        await addDoc(
          sub('certificates'),
          data
        );


      /*
       * When VendorFlow makes a unique strong name match,
       * remember the PDF's charter name as an alias.
       *
       * Example:
       * Pacific Coast Academy
       *        ↕
       * Pacific Coast Academy (PCA)
       */
      if(
        charterResolution?.type==='strong' &&
        extractedCharterName
      ){

        await rememberCharterAlias(
          charter,
          extractedCharterName
        );
      }


      await log(
        'Certificate added',
        `${charter.name} certificate for ` +
        `${data.student} — ${money(amount)} — ` +
        `${automatic?'automatic':'bulk'} PDF import.`,
        'VendorFlow',
        {
          type:'certificate',
          id:importedCertificateRef.id
        }
      );


      item.state='imported';

      item.message=
        'Imported successfully.';

      imported++;


      if(status){

        status.textContent=
          automatic
            ? `Finalizing certificate ${index+1} of ${candidates.length}…`
            : `Importing certificate ${index+1} of ${candidates.length}…`;
      }
    }


    await refreshAll();


    bulkCertificateItems=
      bulkCertificateItems.filter(
        item=>
          item.state!=='imported' &&
          !item.duplicateQueued
      );


    renderBulkCertificateItems();


    const summary=
      `${imported} certificate${imported===1?'':'s'} imported` +
      `${duplicates ? ` · ${duplicates} possible duplicate${duplicates===1?'':'s'} sent to review` : ''}` +
      `${skipped ? ` · ${skipped} skipped` : ''}.`;


    if(
      automatic &&
      imported>0 &&
      duplicates===0 &&
      skipped===0 &&
      bulkCertificateItems.length===0
    ){

      resetBulkCertificateIntake();

      showCertificateImportConfirmation(
        `${imported} certificate${imported===1?'':'s'} imported.`
      );

    }else{

      if(status){

        status.textContent=
          summary;
      }


      if(
        duplicates ||
        skipped
      ){

        const needsReviewOnly=
          duplicates>0 &&
          skipped===0;


        showCertificateImportConfirmation(
          `${imported} certificate${imported===1?'':'s'} imported. ` +
          `${duplicates+skipped} need attention. ` +
          `Click to review.`,
          needsReviewOnly
            ? 'needs-review-page'
            : 'batch-review'
        );
      }
    }


    if(!automatic){

      toast(
        summary
      );
    }


    return {
      imported,
      duplicates,
      skipped
    };


  }catch(error){

    console.error(
      'Certificate import failed:',
      error
    );


    toast(
      error?.message ||
      'VendorFlow could not finish importing the certificates.'
    );


    return {
      imported,
      duplicates,
      skipped,
      error
    };


  }finally{

    renderBulkCertificateItems();

    updateBulkCertificateImportButton();
  }
}


if($('#importReadyCertificates')){

  $('#importReadyCertificates')
    .addEventListener(
      'click',
      ()=>importReadyBulkCertificates({
        automatic:false
      })
    );
}


if($('#chooseBulkCertificates')){

  $('#chooseBulkCertificates')
    .addEventListener(
      'click',
      ()=>{

        $('#bulkCertificateFiles')
          ?.click();
      }
    );
}


if($('#bulkCertificateFiles')){

  $('#bulkCertificateFiles')
    .addEventListener(
      'change',
      event=>{

        showCertificateImportConfirmation('');

        const files=[
          ...(event.target.files || [])
        ];


        const pdfs=
          files.filter(
            file=>
              file.type==='application/pdf' ||
              file.name
                .toLowerCase()
                .endsWith('.pdf')
          );

        if(pdfs.length>20){

          event.target.value='';

          resetBulkCertificateIntake();

          toast(
            'Choose no more than 20 certificate PDFs at a time.'
          );

          return;
        }


        bulkCertificateItems=
          pdfs.map(
            file=>({
              id:bulkCertificateItemId(),
              file,
              state:'waiting',
              result:null,
              message:''
            })
          );


        if(!bulkCertificateItems.length){

          resetBulkCertificateIntake();

          toast(
            'Choose one or more certificate PDFs.'
          );

          return;
        }


        show(
          $('#bulkCertificateWorkspace')
        );


        const status=
          $('#bulkCertificateStatus');

        if(status){

          status.textContent=
            `${bulkCertificateItems.length} certificate` +
            `${bulkCertificateItems.length===1 ? '' : 's'} selected. ` +
            (
              vendorReviewsCertificatesBeforeImport()
                ? `VendorFlow will read them for your review.`
                : `VendorFlow will read and import the certificates it can verify safely.`
            );
        }


        renderBulkCertificateItems();
      }
    );
}


if($('#startBulkCertificates')){

  $('#startBulkCertificates')
    .addEventListener(
      'click',
      processBulkCertificateBatch
    );
}


if($('#clearBulkCertificates')){

  $('#clearBulkCertificates')
    .addEventListener(
      'click',
      resetBulkCertificateIntake
    );
}



/* ==========================================================
   BULK CERTIFICATE REVIEW
   ========================================================== */

let activeBulkCertificateReviewId='';

let activeBulkCertificatePdfDocument=null;

let activeBulkCertificatePdfData=null;

let bulkCertificatePdfZoom=1;


if(window.pdfjsLib){

  window.pdfjsLib.GlobalWorkerOptions.workerSrc=
    'vendor/pdfjs/pdf.worker.min.js';
}


function clearBulkCertificatePdf(){

  activeBulkCertificatePdfDocument=null;
  activeBulkCertificatePdfData=null;
  bulkCertificatePdfZoom=1;


  const pages=
    $('#bulkCertificatePdfPages');

  if(pages){
    pages.innerHTML='';
  }


  const status=
    $('#bulkCertificatePdfStatus');

  if(status){
    status.textContent='';
  }


  updateBulkCertificatePdfZoomLabel();
}


function updateBulkCertificatePdfZoomLabel(){

  const label=
    $('#bulkPdfZoomLabel');

  if(!label){
    return;
  }


  if(
    Math.abs(
      bulkCertificatePdfZoom-1
    )<0.01
  ){
    label.textContent='Fit';
    return;
  }


  label.textContent=
    `${Math.round(
      bulkCertificatePdfZoom*100
    )}%`;
}


async function renderBulkCertificatePdf(){

  const pdf=
    activeBulkCertificatePdfDocument;

  const pages=
    $('#bulkCertificatePdfPages');

  const viewportBox=
    $('#bulkCertificatePdfViewport');

  const status=
    $('#bulkCertificatePdfStatus');


  if(
    !pdf ||
    !pages ||
    !viewportBox
  ){
    return;
  }


  pages.innerHTML='';


  if(status){
    status.textContent=
      'Rendering certificate…';
  }


  try{

    const firstPage=
      await pdf.getPage(1);


    const baseViewport=
      firstPage.getViewport({
        scale:1
      });


    const availableWidth=
      Math.max(
        300,
        viewportBox.clientWidth-28
      );


    const fitScale=
      availableWidth /
      baseViewport.width;


    const renderScale=
      fitScale *
      bulkCertificatePdfZoom;


    const deviceScale=
      Math.min(
        window.devicePixelRatio || 1,
        2
      );


    for(
      let pageNumber=1;
      pageNumber<=pdf.numPages;
      pageNumber++
    ){

      const page=
        pageNumber===1
          ? firstPage
          : await pdf.getPage(
              pageNumber
            );


      const viewport=
        page.getViewport({
          scale:renderScale
        });


      const wrapper=
        document.createElement('div');

      wrapper.className=
        'vf-bulk-pdf-page';


      const canvas=
        document.createElement('canvas');


      canvas.width=
        Math.floor(
          viewport.width *
          deviceScale
        );

      canvas.height=
        Math.floor(
          viewport.height *
          deviceScale
        );


      canvas.style.width=
        `${Math.floor(
          viewport.width
        )}px`;

      canvas.style.height=
        `${Math.floor(
          viewport.height
        )}px`;


      const context=
        canvas.getContext('2d');


      wrapper.appendChild(
        canvas
      );

      pages.appendChild(
        wrapper
      );


      await page.render({
        canvasContext:context,
        viewport,
        transform:
          deviceScale===1
            ? null
            : [
                deviceScale,
                0,
                0,
                deviceScale,
                0,
                0
              ]
      }).promise;
    }


    if(status){
      status.textContent='';
    }


    updateBulkCertificatePdfZoomLabel();


  }catch(error){

    console.error(
      'Certificate PDF render failed:',
      error
    );


    if(status){
      status.textContent=
        error?.message ||
        'Could not display the certificate.';
    }
  }
}


async function loadBulkCertificatePdf(
  item
){

  clearBulkCertificatePdf();


  const status=
    $('#bulkCertificatePdfStatus');


  if(
    !item?.result?.objectKey
  ){

    if(status){
      status.textContent=
        'Original PDF is not available.';
    }

    return;
  }


  if(!window.pdfjsLib){

    if(status){
      status.textContent=
        'PDF viewer did not load.';
    }

    return;
  }


  if(status){
    status.textContent=
      'Loading original certificate…';
  }


  try{

    const token=
      await user.getIdToken();


    const response=
      await fetch(
        `${VENDORFLOW_API}/certificate/file/` +
        encodeURIComponent(
          item.result.objectKey
        ),
        {
          headers:{
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    if(!response.ok){

      let data={};

      try{
        data=
          await response.json();
      }catch{}


      throw new Error(
        data.error ||
        'Could not load certificate PDF.'
      );
    }


    const arrayBuffer=
      await response.arrayBuffer();


    activeBulkCertificatePdfData=
      new Uint8Array(
        arrayBuffer
      );


    activeBulkCertificatePdfDocument=
      await window.pdfjsLib
        .getDocument({
          data:
            activeBulkCertificatePdfData
        })
        .promise;


    bulkCertificatePdfZoom=1;


    await renderBulkCertificatePdf();


    const viewport=
      $('#bulkCertificatePdfViewport');

    if(viewport){
      viewport.scrollLeft=0;
      viewport.scrollTop=0;
    }


  }catch(error){

    console.error(
      'Bulk certificate PDF preview failed:',
      error
    );


    if(status){
      status.textContent=
        error?.message ||
        'Could not display the original certificate.';
    }
  }
}


async function changeBulkPdfZoom(
  amount
){

  if(
    !activeBulkCertificatePdfDocument
  ){
    return;
  }


  bulkCertificatePdfZoom=
    Math.max(
      .5,
      Math.min(
        3,
        bulkCertificatePdfZoom+
        amount
      )
    );


  await renderBulkCertificatePdf();
}


async function fitBulkPdf(){

  if(
    !activeBulkCertificatePdfDocument
  ){
    return;
  }


  bulkCertificatePdfZoom=1;

  await renderBulkCertificatePdf();


  const viewport=
    $('#bulkCertificatePdfViewport');

  if(viewport){
    viewport.scrollLeft=0;
    viewport.scrollTop=0;
  }
}


if($('#bulkPdfZoomIn')){

  $('#bulkPdfZoomIn').onclick=
    ()=>changeBulkPdfZoom(.25);
}


if($('#bulkPdfZoomOut')){

  $('#bulkPdfZoomOut').onclick=
    ()=>changeBulkPdfZoom(-.25);
}


if($('#bulkPdfFit')){

  $('#bulkPdfFit').onclick=
    fitBulkPdf;
}



/*
 * Small read-only helpers used by the bulk certificate
 * list and verification window.
 *
 * These do NOT save anything or change financial data.
 */

function bulkCertificateExtraction(item){

  return item?.result?.extraction || {};
}


function bulkCertificateStudentName(item){

  const x=
    bulkCertificateExtraction(item);

  return (
    x.studentName ||
    x.student ||
    x.learnerName ||
    ''
  );
}


function bulkCertificateSchoolName(item){

  const x=
    bulkCertificateExtraction(item);

  return (
    x.charterSchool ||
    x.charterSchoolName ||
    x.schoolName ||
    x.school ||
    ''
  );
}


function bulkCertificateAmount(item){

  const x=
    bulkCertificateExtraction(item);

  return Number(
    x.amount ||
    x.certificateAmount ||
    0
  );
}


function bulkCertificateReference(item){

  const x=
    bulkCertificateExtraction(item);

  return (
    x.certificateNumber ||
    x.purchaseOrderNumber ||
    ''
  );
}



/*
 * The certificate evidence modal is authored inside the
 * Certificates view in index.html.
 *
 * Inactive VendorFlow views use display:none, so opening that
 * modal while the vendor is on Students, Actions, etc. would
 * technically open it INSIDE a hidden parent.
 *
 * Move the one shared modal to document.body once. It can then
 * be opened from every VendorFlow view.
 */
function moveCertificateEvidenceModalToRoot(){

  const modal=
    $('#bulkCertificateReviewModal');


  if(
    !modal ||
    modal.parentElement===document.body
  ){
    return;
  }


  document.body.appendChild(
    modal
  );
}


moveCertificateEvidenceModalToRoot();


/* ==========================================================
   BULK CERTIFICATE VENDOR REVIEW / CORRECTIONS
   ========================================================== */


let savedCertificateEvidenceMode=false;
let savedCertificateEvidenceId='';


function savedCertificateEvidenceItem(){

  if(
    !savedCertificateEvidenceMode ||
    !savedCertificateEvidenceId
  ){
    return null;
  }


  const cert=
    certs.find(
      item=>
        item.id===
        savedCertificateEvidenceId
    );


  if(!cert){
    return null;
  }


  const extraction={
    ...(cert.extraction || {}),

    studentName:
      cert.student ||
      cert.extraction?.studentName ||
      '',

    charterSchool:
      cert.charterSchoolName ||
      cert.school ||
      cert.extraction?.charterSchool ||
      '',

    serviceAmount:
      Number(
        cert.serviceAmount ??
        Math.max(
          0,
          Number(cert.amount||0) -
          Number(cert.materialsFee||0)
        )
      ),

    materialsFee:
      Number(
        cert.materialsFee || 0
      ),

    amount:
      Number(cert.amount||0),

    certificateNumber:
      cert.number ||
      cert.extraction?.certificateNumber ||
      '',

    issueDate:
      cert.issueDate ||
      cert.extraction?.issueDate ||
      '',

    serviceStartDate:
      cert.serviceStartDate ||
      cert.extraction?.serviceStartDate ||
      '',

    serviceEndDate:
      cert.serviceEndDate ||
      cert.extraction?.serviceEndDate ||
      '',

    billingEmail:
      cert.billingEmail ||
      cert.charterBillingEmail ||
      cert.extraction?.billingEmail ||
      '',

    serviceDescription:
      cert.serviceDescription ||
      cert.extraction?.serviceDescription ||
      '',

    invoiceInstructions:
      cert.invoiceInstructions ||
      cert.extraction?.invoiceInstructions ||
      ''
  };


  return {

    id:
      `saved-certificate-${cert.id}`,

    state:'saved',

    file:{
      name:
        cert.pdfName ||
        cert.number ||
        'Saved certificate'
    },

    result:{
      objectKey:
        cert.pdfObjectKey || '',

      originalName:
        cert.pdfName || '',

      size:
        Number(cert.pdfSize||0),

      extraction,

      clientValidation:{
        safe:true,
        problems:[],
        warnings:[]
      }
    },

    vendorOverrides:{
      ...extraction
    },

    savedCertificate:
      cert
  };
}


function openSavedCertificateEvidence(
  certificateId
){

  const cert=
    certs.find(
      item=>
        item.id===certificateId
    );


  if(!cert){
    return;
  }


  savedCertificateEvidenceMode=true;
  savedCertificateEvidenceId=
    cert.id;


  const item=
    savedCertificateEvidenceItem();


  if(!item){
    return;
  }


  activeBulkCertificateReviewId=
    item.id;


  bulkCertificateEditMode=false;


  const title=
    $('#bulkCertificateReviewTitle');

  if(title){

    title.textContent=
      cert.student ||
      cert.number ||
      'Certificate';
  }


  const status=
    $('#bulkCertificateReviewStatus');

  if(status){

    status.innerHTML=
      '<strong>Saved certificate</strong>' +
      '<div>This certificate is already recorded in VendorFlow.</div>';
  }


  /*
   * Saved evidence is for checking the record, not importing it.
   */
  const approve=
    $('#approveBulkCertificateReview');

  if(approve){

    approve.classList.add(
      'hidden'
    );
  }


  const edit=
    $('#editBulkCertificateExtraction');

  if(edit){

    edit.classList.remove(
      'hidden'
    );
  }


  const done=
    $('#doneBulkCertificateReview');

  if(done){

    done.classList.remove(
      'hidden'
    );
  }


  renderBulkCertificateReviewFields(
    item
  );


  show(
    $('#bulkCertificateReviewModal')
  );


  loadBulkCertificatePdf(
    item
  );
}


let bulkCertificateEditMode=false;


function activeBulkCertificateItem(){

  if(savedCertificateEvidenceMode){

    return (
      savedCertificateEvidenceItem() ||
      null
    );
  }


  return bulkCertificateItems.find(
    item=>
      item.id===
      activeBulkCertificateReviewId
  ) || null;
}


function bulkCertificateVendorExtraction(
  item
){

  const original=
    bulkCertificateExtraction(item) || {};


  return {
    ...original,
    ...(item?.vendorOverrides || {})
  };
}


function setBulkCertificateEditMode(
  editing
){

  bulkCertificateEditMode=
    Boolean(editing);


  const edit=
    $('#editBulkCertificateExtraction');

  const save=
    $('#saveBulkCertificateCorrections');

  const cancel=
    $('#cancelBulkCertificateCorrections');

  const restore=
    $('#restoreBulkCertificateExtraction');


  if(edit){
    edit.classList.toggle(
      'hidden',
      bulkCertificateEditMode
    );
  }


  if(save){
    save.classList.toggle(
      'hidden',
      !bulkCertificateEditMode
    );
  }


  if(cancel){
    cancel.classList.toggle(
      'hidden',
      !bulkCertificateEditMode
    );
  }


  if(restore){

    const item=
      activeBulkCertificateItem();

    restore.classList.toggle(
      'hidden',
      savedCertificateEvidenceMode ||
      !bulkCertificateEditMode ||
      !item?.vendorEdited
    );
  }
}


function updateBulkVendorEditNotice(
  item
){

  const notice=
    $('#bulkCertificateVendorEditNotice');

  if(!notice){
    return;
  }


  notice.classList.toggle(
    'hidden',
    !item?.vendorEdited
  );
}


function bulkCertificateReviewDisplayValue(
  value
){

  if(
    value===undefined ||
    value===null ||
    String(value).trim()===''
  ){
    return 'Not found';
  }

  return String(value);
}



function renderBulkCharterMatchSuggestions(
  item
){

  const readiness=
    bulkCertificateImportReadiness(
      item,
      {
        automatic:false
      }
    );


  if(readiness.charter){
    return '';
  }


  const candidates=
    readiness.charterResolution
      ?.candidates || [];


  if(!candidates.length){
    return '';
  }


  return `
    <div class="vf-bulk-charter-suggestions">

      <strong>
        Which saved charter school is this?
      </strong>

      <div class="vf-bulk-charter-suggestion-help">
        VendorFlow found a close match. Choose it once and
        VendorFlow will remember it for future certificates.
      </div>

      <div class="vf-bulk-charter-suggestion-buttons">

        ${candidates
          .map(
            charter=>`
              <button
                type="button"
                class="vf-bulk-charter-suggestion"
                data-bulk-charter-match="${esc(charter.id)}">

                ${esc(charter.name || 'Saved charter')}

              </button>
            `
          )
          .join('')
        }

      </div>

    </div>
  `;
}


function wireBulkCharterMatchSuggestions(){

  $$('[data-bulk-charter-match]')
    .forEach(
      button=>{

        button.onclick=
          async ()=>{

            const item=
              activeBulkCertificateItem();

            if(!item){
              return;
            }


            const charter=
              charterSchools.find(
                candidate=>
                  candidate.id===
                  button.dataset.bulkCharterMatch
              );


            if(!charter){
              return;
            }


            const x=
              bulkCertificateVendorExtraction(
                item
              );


            const extractedName=
              String(
                x.charterSchool ||
                x.charterSchoolName ||
                x.schoolName ||
                x.school ||
                ''
              ).trim();


            item.vendorOverrides={
              ...(item.vendorOverrides || {}),

              charterSchool:
                charter.name
            };


            item.vendorApproved=true;

            item.message=
              `Matched to ${charter.name}.`;


            if(item.result){

              item.result.extraction={
                ...(item.result.extraction || {}),

                charterSchool:
                  charter.name
              };
            }


            if(extractedName){

              await rememberCharterAlias(
                charter,
                extractedName
              );
            }


            renderBulkCertificateReviewFields(
              item
            );

            renderBulkCertificateItems();

            wireBulkCharterMatchSuggestions();
          };
      }
    );
}


function renderBulkCertificateReviewFields(
  item
){

  const fields=
    $('#bulkCertificateReviewFields');

  if(!fields || !item){
    return;
  }


  const x=
    bulkCertificateVendorExtraction(
      item
    );


  if(bulkCertificateEditMode){

    fields.innerHTML=`

      <label>
        <span>Student</span>
        <input
          class="input"
          data-bulk-edit="studentName"
          value="${esc(
            x.studentName || ''
          )}">
      </label>

      <label>
        <span>Charter school</span>
        <input
          class="input"
          data-bulk-edit="charterSchool"
          value="${esc(
            x.charterSchool ||
            x.schoolName ||
            ''
          )}">
      </label>

      <label>
        <span>Service amount</span>
        <input
          class="input"
          type="number"
          min="0"
          step=".01"
          data-bulk-edit="serviceAmount"
          value="${esc(
            x.serviceAmount ?? ''
          )}">
      </label>

      <label>
        <span>Materials fee</span>
        <input
          class="input"
          type="number"
          min="0"
          step=".01"
          data-bulk-edit="materialsFee"
          value="${esc(
            x.materialsFee ?? ''
          )}">
      </label>

      <label>
        <span>Total certificate amount</span>
        <input
          class="input"
          type="number"
          min="0"
          step=".01"
          data-bulk-edit="amount"
          value="${esc(
            x.amount ?? ''
          )}">
      </label>

      <label>
        <span>Certificate / PO #</span>
        <input
          class="input"
          data-bulk-edit="certificateNumber"
          value="${esc(
            x.certificateNumber ||
            x.purchaseOrderNumber ||
            ''
          )}">
      </label>

      <label>
        <span>Issue date</span>
        <input
          class="input"
          data-bulk-edit="issueDate"
          value="${esc(
            x.issueDate || ''
          )}">
      </label>

      <label>
        <span>Service start</span>
        <input
          class="input"
          data-bulk-edit="serviceStartDate"
          value="${esc(
            x.serviceStartDate || ''
          )}">
      </label>

      <label>
        <span>Service end</span>
        <input
          class="input"
          data-bulk-edit="serviceEndDate"
          value="${esc(
            x.serviceEndDate || ''
          )}">
      </label>

      <label>
        <span>Billing email</span>
        <input
          class="input"
          type="email"
          data-bulk-edit="billingEmail"
          value="${esc(
            x.billingEmail || ''
          )}">
      </label>

      <label class="vf-bulk-review-wide">
        <span>Service description</span>
        <textarea
          class="input"
          rows="3"
          data-bulk-edit="serviceDescription">${esc(
            x.serviceDescription || ''
          )}</textarea>
      </label>

      <label class="vf-bulk-review-wide">
        <span>Invoice instructions</span>
        <textarea
          class="input"
          rows="4"
          data-bulk-edit="invoiceInstructions">${esc(
            x.invoiceInstructions || ''
          )}</textarea>
      </label>

    `;

    return;
  }


  const amount=
    Number(x.amount || 0);


  fields.innerHTML=`

    ${renderBulkCharterMatchSuggestions(item)}

    <div>
      <span>Student</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.studentName
          )
        )}
      </strong>
    </div>

    <div>
      <span>Charter school</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.charterSchool ||
            x.schoolName
          )
        )}
      </strong>
    </div>

    <div>
      <span>Service amount</span>
      <strong>
        ${
          Number(x.serviceAmount || 0)>0
            ? money(Number(x.serviceAmount || 0))
            : 'Not found'
        }
      </strong>
    </div>

    ${
      Number(x.materialsFee || 0)>0
        ? `
          <div>
            <span>Materials fee</span>
            <strong>
              ${money(Number(x.materialsFee || 0))}
            </strong>
          </div>
        `
        : ''
    }

    <div>
      <span>Total certificate amount</span>
      <strong>
        ${
          amount>0
            ? money(amount)
            : 'Not found'
        }
      </strong>
    </div>

    <div>
      <span>Certificate / PO #</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.certificateNumber ||
            x.purchaseOrderNumber
          )
        )}
      </strong>
    </div>

    <div>
      <span>Issue date</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.issueDate
          )
        )}
      </strong>
    </div>

    <div>
      <span>Service start</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.serviceStartDate
          )
        )}
      </strong>
    </div>

    <div>
      <span>Service end</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.serviceEndDate
          )
        )}
      </strong>
    </div>

    <div>
      <span>Billing email</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.billingEmail
          )
        )}
      </strong>
    </div>

    <div class="vf-bulk-review-wide">
      <span>Service description</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.serviceDescription
          )
        )}
      </strong>
    </div>

    <div class="vf-bulk-review-wide">
      <span>Invoice instructions</span>
      <strong>
        ${esc(
          bulkCertificateReviewDisplayValue(
            x.invoiceInstructions
          )
        )}
      </strong>
    </div>

  `;

  wireBulkCharterMatchSuggestions();
}


function enterBulkCertificateEdit(){

  const item=
    activeBulkCertificateItem();

  if(!item){
    return;
  }

  setBulkCertificateEditMode(true);

  renderBulkCertificateReviewFields(
    item
  );
}


function cancelBulkCertificateEdit(){

  const item=
    activeBulkCertificateItem();

  if(!item){
    return;
  }

  setBulkCertificateEditMode(false);

  renderBulkCertificateReviewFields(
    item
  );
}



async function saveSavedCertificateEvidenceCorrections(
  item,
  overrides
){

  const cert=
    item?.savedCertificate;


  if(
    !cert ||
    !cert.id
  ){
    return;
  }


  const status=
    $('#bulkCertificateReviewStatus');

  const saveButton=
    $('#saveBulkCertificateCorrections');


  const showProblem=
    message=>{

      if(status){

        status.innerHTML=
          '<strong>Cannot save yet</strong>' +
          `<div class="vf-bulk-review-warning">${esc(message)}</div>`;
      }
    };


  const studentName=
    String(
      overrides.studentName || ''
    ).trim();


  const student=
    exactBulkCertificateStudent(
      studentName
    );


  if(!student){

    showProblem(
      'Student must match one saved VendorFlow student.'
    );

    return;
  }


  const charterName=
    String(
      overrides.charterSchool || ''
    ).trim();


  const charterResolution=
    resolveSavedCharterMatch(
      charterName
    );


  const charter=
    charterResolution.charter;


  if(!charter){

    showProblem(
      'Choose a charter school that matches one saved VendorFlow charter.'
    );

    return;
  }


  const amount=
    Number(
      overrides.amount || 0
    );


  const materialsFee=
    Math.max(
      0,
      Number(
        overrides.materialsFee || 0
      )
    );


  let serviceAmount=
    overrides.serviceAmount;


  if(
    serviceAmount==='' ||
    serviceAmount===undefined ||
    serviceAmount===null
  ){

    serviceAmount=
      Math.max(
        0,
        amount-materialsFee
      );

  }else{

    serviceAmount=
      Math.max(
        0,
        Number(serviceAmount)
      );
  }


  if(!(amount>0)){

    showProblem(
      'Total certificate amount must be greater than zero.'
    );

    return;
  }


  if(
    Math.abs(
      (
        Number(serviceAmount) +
        Number(materialsFee)
      ) -
      amount
    ) > .009
  ){

    showProblem(
      'Service amount plus materials fee must equal the total certificate amount.'
    );

    return;
  }


  const number=
    String(
      overrides.certificateNumber || ''
    ).trim();


  if(!number){

    showProblem(
      'Certificate / PO number is required.'
    );

    return;
  }


  const duplicate=
    findDuplicateCertificate({
      number
    });


  if(
    duplicate &&
    duplicate.id!==cert.id
  ){

    showProblem(
      'That certificate / PO number already belongs to another certificate.'
    );

    return;
  }


  const serviceStartDate=
    String(
      overrides.serviceStartDate || ''
    ).trim();


  if(!serviceStartDate){

    showProblem(
      'Service start date is required.'
    );

    return;
  }


  const invoiceSchedule=
    certificateInvoiceSchedule(
      serviceStartDate,
      charter
    );


  const originalExtraction={
    ...(cert.extraction || {})
  };


  const vendorCorrections={

    studentName:
      student.studentName ||
      studentName,

    charterSchool:
      charter.name,

    serviceAmount,

    materialsFee,

    amount,

    certificateNumber:
      number,

    issueDate:
      String(
        overrides.issueDate || ''
      ).trim(),

    serviceStartDate,

    serviceEndDate:
      String(
        overrides.serviceEndDate || ''
      ).trim(),

    billingEmail:
      String(
        overrides.billingEmail ||
        charter.billingEmail ||
        ''
      ).trim(),

    serviceDescription:
      String(
        overrides.serviceDescription || ''
      ).trim(),

    invoiceInstructions:
      String(
        overrides.invoiceInstructions || ''
      ).trim()
  };


  const update={

    studentId:
      student.id,

    student:
      student.studentName ||
      studentName,

    parentName:
      student.parentName || '',

    parentEmail:
      student.parentEmail || '',


    school:
      charter.name,

    charterSchoolId:
      charter.id,

    charterSchoolName:
      charter.name,

    charterMatched:true,

    charterBillingEmail:
      charter.billingEmail || '',

    charterAddress:
      charter.address || '',

    charterCity:
      charter.city || '',

    charterState:
      charter.state || '',

    charterZip:
      charter.zip || '',


    amount,

    serviceAmount,

    materialsFee,

    number,

    issueDate:
      vendorCorrections.issueDate,

    serviceStartDate,

    serviceEndDate:
      vendorCorrections.serviceEndDate,

    billingEmail:
      vendorCorrections.billingEmail,

    serviceDescription:
      vendorCorrections.serviceDescription,

    invoiceInstructions:
      vendorCorrections.invoiceInstructions,


    invoiceDaysAfterStart:
      invoiceSchedule.days,

    invoiceReadyDate:
      invoiceSchedule.readyDate,

    invoiceScheduleValid:
      Boolean(
        invoiceSchedule.valid
      ),

    invoiceScheduleSource:
      'Charter school settings',


    /*
     * Preserve VendorFlow's original extraction.
     * Human corrections are kept separately for auditability.
     */
    extraction:
      originalExtraction,

    vendorCorrections,

    vendorEdited:true,

    updatedAt:
      serverTimestamp()
  };


  if(saveButton){

    saveButton.disabled=true;

    saveButton.textContent=
      'Saving…';
  }


  try{

    await setDoc(
      doc(
        db,
        'vendors',
        user.uid,
        'certificates',
        cert.id
      ),
      update,
      {
        merge:true
      }
    );


    if(
      charterResolution.type==='strong' &&
      charterName
    ){

      await rememberCharterAlias(
        charter,
        charterName
      );
    }


    await log(
      'Certificate updated',
      `${update.student} — ${money(amount)} — certificate evidence corrected.`,
      'Manual',
      {
        type:'certificate',
        id:cert.id
      }
    );


    /*
     * Student balances, receivables, invoice readiness,
     * certificate lists and history are all derived from
     * the saved records, so refresh everything after the write.
     */
    await refreshAll();


    setBulkCertificateEditMode(
      false
    );


    const refreshed=
      savedCertificateEvidenceItem();


    if(refreshed){

      renderBulkCertificateReviewFields(
        refreshed
      );

      updateBulkVendorEditNotice(
        {
          vendorEdited:true
        }
      );
    }


    if(status){

      status.innerHTML=
        '<strong>Saved</strong>' +
        '<div>Certificate corrections have been saved to VendorFlow.</div>';
    }


  }catch(error){

    console.error(
      'Saved certificate evidence update failed:',
      error
    );


    showProblem(
      error?.message ||
      'VendorFlow could not save these certificate corrections.'
    );


  }finally{

    if(saveButton){

      saveButton.disabled=false;

      saveButton.textContent=
        'Save corrections';
    }
  }
}


async function saveBulkCertificateCorrections(){

  const item=
    activeBulkCertificateItem();

  if(!item){
    return;
  }


  const original=
    bulkCertificateExtraction(item) || {};

  const overrides={};


  $$('#bulkCertificateReviewFields [data-bulk-edit]')
    .forEach(field=>{

      const key=
        field.dataset.bulkEdit;

      let value=
        field.value.trim();


      if(
        key==='amount' ||
        key==='serviceAmount' ||
        key==='materialsFee'
      ){
        value=
          value===''
            ? ''
            : Number(value);
      }


      overrides[key]=value;
    });


  /*
   * An already-imported certificate is a REAL account record.
   * Save through the persistent certificate update path rather
   * than mutating the temporary intake object.
   */
  if(savedCertificateEvidenceMode){

    await saveSavedCertificateEvidenceCorrections(
      item,
      overrides
    );

    return;
  }


  /*
   * Keep the vendor's deliberate correction separate
   * from the AI extraction.
   *
   * This lets us preserve the original reading while
   * ensuring later review/import uses the human correction.
   */
  item.vendorOverrides=
    overrides;

  item.vendorEdited=true;


  /*
   * Also mirror the corrected values into the pending
   * extraction object so the EXISTING batch helpers,
   * validation display and future import step see the
   * vendor-approved values.
   *
   * This affects only the unsaved batch item.
   */
  if(item.result){

    item.result.extraction={
      ...original,
      ...overrides
    };


    if(
      Object.prototype.hasOwnProperty.call(
        overrides,
        'certificateNumber'
      )
    ){
      item.result.extraction
        .purchaseOrderNumber='';
    }
  }


  item.message=
    'Corrections saved. Reviewed by vendor.';


  setBulkCertificateEditMode(false);

  renderBulkCertificateReviewFields(
    item
  );

  updateBulkVendorEditNotice(
    item
  );

  renderBulkCertificateItems();
}


function restoreBulkCertificateReading(){

  const item=
    activeBulkCertificateItem();

  if(!item){
    return;
  }


  /*
   * Capture the original AI reading the first time a
   * vendor correction is made.
   *
   * Older batch items without that snapshot simply
   * clear their temporary overrides.
   */
  if(item.originalVendorFlowExtraction){

    if(item.result){
      item.result.extraction={
        ...item.originalVendorFlowExtraction
      };
    }
  }


  item.vendorOverrides={};
  item.vendorEdited=false;

  item.message=
    'VendorFlow reading restored.';


  setBulkCertificateEditMode(false);

  renderBulkCertificateReviewFields(
    item
  );

  updateBulkVendorEditNotice(
    item
  );

  renderBulkCertificateItems();
}


if($('#editBulkCertificateExtraction')){

  $('#editBulkCertificateExtraction')
    .onclick=
      ()=>{

        const item=
          activeBulkCertificateItem();

        if(
          item &&
          !item.originalVendorFlowExtraction
        ){

          item.originalVendorFlowExtraction={
            ...(bulkCertificateExtraction(item) || {})
          };
        }

        enterBulkCertificateEdit();
      };
}


if($('#saveBulkCertificateCorrections')){

  $('#saveBulkCertificateCorrections')
    .onclick=
      saveBulkCertificateCorrections;
}


if($('#cancelBulkCertificateCorrections')){

  $('#cancelBulkCertificateCorrections')
    .onclick=
      cancelBulkCertificateEdit;
}


if($('#restoreBulkCertificateExtraction')){

  $('#restoreBulkCertificateExtraction')
    .onclick=
      restoreBulkCertificateReading;
}


function closeBulkCertificateReview(){

  activeBulkCertificateReviewId='';

  bulkCertificateEditMode=false;

  savedCertificateEvidenceMode=false;
  savedCertificateEvidenceId='';


  const approve=
    $('#approveBulkCertificateReview');

  if(approve){

    approve.classList.remove(
      'hidden'
    );
  }


  const edit=
    $('#editBulkCertificateExtraction');

  if(edit){

    edit.classList.remove(
      'hidden'
    );
  }

  clearBulkCertificatePdf();

  hide(
    $('#bulkCertificateReviewModal')
  );
}


function openBulkCertificateReview(itemId){

  const item=
    bulkCertificateItems.find(
      entry=>entry.id===itemId
    );

  if(!item){
    return;
  }


  activeBulkCertificateReviewId=
    item.id;


  const validation=
    item.result?.clientValidation || {};


  const status=
    $('#bulkCertificateReviewStatus');

  const title=
    $('#bulkCertificateReviewTitle');



  if(title){

    title.textContent=
      bulkCertificateStudentName(item) ||
      item.file?.name ||
      'Review certificate';
  }


  if(status){

    let heading=
      'Waiting';

    if(item.state==='ready'){
      heading='Ready';
    }

    if(item.state==='review'){
      heading='Check this certificate';
    }

    if(item.state==='error'){
      heading='Problem reading certificate';
    }


    const problems=[
      ...(validation.problems || [])
    ];

    const warnings=[
      ...(validation.warnings || [])
    ];


    status.innerHTML=`
      <strong>${esc(heading)}</strong>

      ${
        item.message
          ? `<div>${esc(item.message)}</div>`
          : ''
      }

      ${
        problems.length
          ? `
            <div class="vf-bulk-review-warning">
              ${problems
                .map(
                  problem=>
                    `<div>• ${esc(problem)}</div>`
                )
                .join('')}
            </div>
          `
          : ''
      }

      ${
        warnings.length
          ? `
            <div class="vf-bulk-review-note">
              ${warnings
                .map(
                  warning=>
                    `<div>• ${esc(warning)}</div>`
                )
                .join('')}
            </div>
          `
          : ''
      }
    `;
  }


  setBulkCertificateEditMode(
    false
  );

  renderBulkCertificateReviewFields(
    item
  );

  updateBulkVendorEditNotice(
    item
  );


  show(
    $('#bulkCertificateReviewModal')
  );


  loadBulkCertificatePdf(
    item
  );
}


function wireBulkCertificateReviewRows(){

  $$('[data-bulk-certificate-review]')
    .forEach(row=>{

      row.onclick=()=>{

        openBulkCertificateReview(
          row.dataset.bulkCertificateReview
        );
      };


      row.onkeydown=
        event=>{

          if(
            event.key==='Enter' ||
            event.key===' '
          ){

            event.preventDefault();

            openBulkCertificateReview(
              row.dataset.bulkCertificateReview
            );
          }
        };
    });
}


if($('#closeBulkCertificateReview')){

  $('#closeBulkCertificateReview')
    .onclick=
      closeBulkCertificateReview;
}



if($('#approveBulkCertificateReview')){

  $('#approveBulkCertificateReview')
    .onclick=
      async ()=>{

        const item=
          activeBulkCertificateItem();

        if(!item){
          return;
        }


        const button=
          $('#approveBulkCertificateReview');


        item.vendorApproved=true;


        if(item.state==='review'){

          item.state='ready';
        }


        item.message=
          'Reviewed by vendor — approved for import.';


        /*
         * Approval never bypasses safety.
         * Run all existing readiness checks again.
         */
        const readiness=
          bulkCertificateImportReadiness(
            item,
            {
              automatic:false
            }
          );


        if(!readiness.ready){

          item.state='review';

          item.message=
            readiness.problems.join(' ');


          renderBulkCertificateItems();

          renderBulkCertificateReviewFields(
            item
          );


          const status=
            $('#bulkCertificateReviewStatus');


          if(status){

            status.innerHTML=
              '<strong>Fix this before importing</strong>' +
              '<div>VendorFlow found something that still needs your attention:</div>' +
              readiness.problems
                .map(
                  problem=>
                    `<div class="vf-bulk-review-warning">• ${esc(problem)}</div>`
                )
                .join('');


            status.scrollIntoView({
              behavior:'smooth',
              block:'nearest'
            });
          }


          /*
           * Do not use a page-level toast here.
           * The review modal covers it and makes the message
           * difficult or impossible to read.
           *
           * The exact blocking reasons are already displayed
           * above the extraction inside this review window.
           */
          return;
        }


        if(button){

          button.disabled=true;

          button.textContent=
            'Importing…';
        }


        try{

          const result=
            await importReadyBulkCertificates({
              automatic:false,
              onlyItemId:item.id,
              skipConfirmation:true
            });


          if(result?.imported===1){

            closeBulkCertificateReview();


            showCertificateImportConfirmation(
              '1 certificate imported.'
            );


            return;
          }


          if(result?.duplicates>0){

            /*
             * Duplicate was not accepted as a certificate.
             * It was moved to Needs Review and removed from
             * this temporary intake batch.
             */
            closeBulkCertificateReview();


            showCertificateImportConfirmation(
              'Possible duplicate sent to Needs Review. Click to review.',
              'needs-review-page'
            );


            return;
          }


          /*
           * A different last-second safety issue may
           * deliberately prevent the import.
           */
          const current=
            bulkCertificateItems.find(
              entry=>
                entry.id===item.id
            );


          if(current){

            activeBulkCertificateReviewId=
              current.id;


            renderBulkCertificateReviewFields(
              current
            );
          }


        }finally{

          if(button){

            button.disabled=false;

            button.textContent=
              'Looks Good — Import Now';
          }
        }
      };
}



if($('#doneBulkCertificateReview')){

  $('#doneBulkCertificateReview')
    .onclick=
      closeBulkCertificateReview;
}


if($('#bulkCertificateReviewModal')){

  $('#bulkCertificateReviewModal')
    .onclick=
      event=>{

        if(
          event.target===
          $('#bulkCertificateReviewModal')
        ){
          closeBulkCertificateReview();
        }
      };
}









/* ==========================================================
   DUPLICATE CERTIFICATE — TWO-PDF COMPARISON
   ========================================================== */

let activeDuplicateCertificateReviewId='';


const duplicatePdfState={

  existing:{
    document:null,
    data:null,
    zoom:1
  },

  incoming:{
    document:null,
    data:null,
    zoom:1
  }
};


function duplicatePdfElements(
  side
){

  const prefix=
    side==='existing'
      ? 'duplicateExisting'
      : 'duplicateIncoming';


  return {

    status:
      $(`#${prefix}PdfStatus`),

    viewport:
      $(`#${prefix}PdfViewport`),

    pages:
      $(`#${prefix}PdfPages`),

    zoomLabel:
      $(`#${prefix}ZoomLabel`)
  };
}


function clearDuplicatePdf(
  side
){

  const state=
    duplicatePdfState[side];

  const elements=
    duplicatePdfElements(side);


  state.document=null;
  state.data=null;
  state.zoom=1;


  if(elements.pages){
    elements.pages.innerHTML='';
  }


  if(elements.status){
    elements.status.textContent='';
  }


  if(elements.zoomLabel){
    elements.zoomLabel.textContent='Fit';
  }
}


async function fetchCertificatePdfBytes(
  objectKey
){

  if(!objectKey){

    throw new Error(
      'Original PDF is not available.'
    );
  }


  const token=
    await user.getIdToken();


  const response=
    await fetch(
      `${VENDORFLOW_API}/certificate/file/` +
      encodeURIComponent(
        objectKey
      ),
      {
        headers:{
          Authorization:
            `Bearer ${token}`
        }
      }
    );


  if(!response.ok){

    let data={};

    try{
      data=
        await response.json();
    }catch{}


    throw new Error(
      data.error ||
      'Could not load certificate PDF.'
    );
  }


  return new Uint8Array(
    await response.arrayBuffer()
  );
}


async function renderDuplicatePdf(
  side
){

  const state=
    duplicatePdfState[side];

  const elements=
    duplicatePdfElements(side);


  if(
    !state.document ||
    !elements.pages
  ){
    return;
  }


  elements.pages.innerHTML='';


  const availableWidth=
    Math.max(
      280,
      Number(
        elements.viewport?.clientWidth ||
        500
      ) - 24
    );


  for(
    let pageNumber=1;
    pageNumber<=state.document.numPages;
    pageNumber++
  ){

    const page=
      await state.document.getPage(
        pageNumber
      );


    const natural=
      page.getViewport({
        scale:1
      });


    const fitScale=
      availableWidth /
      natural.width;


    const scale=
      fitScale *
      state.zoom;


    const viewport=
      page.getViewport({
        scale
      });


    const wrapper=
      document.createElement(
        'div'
      );

    wrapper.className=
      'vf-duplicate-pdf-page';


    const canvas=
      document.createElement(
        'canvas'
      );


    const deviceScale=
      Math.max(
        1,
        window.devicePixelRatio || 1
      );


    canvas.width=
      Math.floor(
        viewport.width *
        deviceScale
      );


    canvas.height=
      Math.floor(
        viewport.height *
        deviceScale
      );


    canvas.style.width=
      `${Math.floor(viewport.width)}px`;

    canvas.style.height=
      `${Math.floor(viewport.height)}px`;


    wrapper.appendChild(
      canvas
    );

    elements.pages.appendChild(
      wrapper
    );


    const context=
      canvas.getContext('2d');


    await page.render({

      canvasContext:
        context,

      viewport,

      transform:
        deviceScale===1
          ? null
          : [
              deviceScale,
              0,
              0,
              deviceScale,
              0,
              0
            ]

    }).promise;
  }


  if(elements.zoomLabel){

    elements.zoomLabel.textContent=
      state.zoom===1
        ? 'Fit'
        : `${Math.round(state.zoom*100)}%`;
  }
}


async function loadDuplicatePdf(
  side,
  objectKey
){

  clearDuplicatePdf(
    side
  );


  const state=
    duplicatePdfState[side];

  const elements=
    duplicatePdfElements(side);


  if(elements.status){

    elements.status.textContent=
      'Loading certificate…';
  }


  if(!window.pdfjsLib){

    if(elements.status){

      elements.status.textContent=
        'PDF viewer did not load.';
    }

    return;
  }


  try{

    state.data=
      await fetchCertificatePdfBytes(
        objectKey
      );


    state.document=
      await window.pdfjsLib
        .getDocument({
          data:
            state.data
        })
        .promise;


    state.zoom=1;


    await renderDuplicatePdf(
      side
    );


    if(elements.status){

      elements.status.textContent='';
    }


    if(elements.viewport){

      elements.viewport.scrollTop=0;
      elements.viewport.scrollLeft=0;
    }


  }catch(error){

    console.error(
      `Duplicate ${side} PDF failed:`,
      error
    );


    if(elements.status){

      elements.status.textContent=
        error?.message ||
        'Could not display this certificate.';
    }
  }
}


async function changeDuplicatePdfZoom(
  side,
  amount
){

  const state=
    duplicatePdfState[side];


  if(!state.document){
    return;
  }


  state.zoom=
    Math.max(
      .5,
      Math.min(
        3,
        state.zoom+amount
      )
    );


  await renderDuplicatePdf(
    side
  );
}


async function fitDuplicatePdf(
  side
){

  const state=
    duplicatePdfState[side];


  if(!state.document){
    return;
  }


  state.zoom=1;


  await renderDuplicatePdf(
    side
  );


  const viewport=
    duplicatePdfElements(
      side
    ).viewport;


  if(viewport){

    viewport.scrollTop=0;
    viewport.scrollLeft=0;
  }
}


function closeDuplicateCertificateCompare(){

  activeDuplicateCertificateReviewId='';


  clearDuplicatePdf(
    'existing'
  );

  clearDuplicatePdf(
    'incoming'
  );


  hide(
    $('#duplicateCertificateCompareModal')
  );
}


async function openDuplicateCertificateCompare(
  reviewId
){

  const review=
    reviews.find(
      item=>
        item.id===reviewId
    );


  if(
    !review ||
    review.reviewType!=='duplicate' ||
    review.itemType!=='certificate'
  ){
    return;
  }


  const existing=
    certs.find(
      certificate=>
        certificate.id===
        review.existingId
    );


  if(!existing){

    toast(
      'VendorFlow could not find the already-recorded certificate.'
    );

    return;
  }


  const incoming=
    review.incoming || {};


  activeDuplicateCertificateReviewId=
    review.id;


  $('#duplicateExistingSummary').textContent=
    review.existingSummary ||
    `${existing.student||''} · ` +
    `${existing.number||''} · ` +
    `${money(existing.amount)}`;


  $('#duplicateIncomingSummary').textContent=
    `${incoming.student||''} · ` +
    `${incoming.number||''} · ` +
    `${money(incoming.amount)}`;


  show(
    $('#duplicateCertificateCompareModal')
  );


  await Promise.all([

    loadDuplicatePdf(
      'existing',
      existing.pdfObjectKey || ''
    ),

    loadDuplicatePdf(
      'incoming',
      incoming.pdfObjectKey || ''
    )

  ]);
}


/* controls */

if($('#closeDuplicateCertificateCompare')){

  $('#closeDuplicateCertificateCompare')
    .onclick=
      closeDuplicateCertificateCompare;
}


if($('#duplicateExistingZoomIn')){

  $('#duplicateExistingZoomIn')
    .onclick=
      ()=>changeDuplicatePdfZoom(
        'existing',
        .25
      );
}


if($('#duplicateExistingZoomOut')){

  $('#duplicateExistingZoomOut')
    .onclick=
      ()=>changeDuplicatePdfZoom(
        'existing',
        -.25
      );
}


if($('#duplicateExistingFit')){

  $('#duplicateExistingFit')
    .onclick=
      ()=>fitDuplicatePdf(
        'existing'
      );
}


if($('#duplicateIncomingZoomIn')){

  $('#duplicateIncomingZoomIn')
    .onclick=
      ()=>changeDuplicatePdfZoom(
        'incoming',
        .25
      );
}


if($('#duplicateIncomingZoomOut')){

  $('#duplicateIncomingZoomOut')
    .onclick=
      ()=>changeDuplicatePdfZoom(
        'incoming',
        -.25
      );
}


if($('#duplicateIncomingFit')){

  $('#duplicateIncomingFit')
    .onclick=
      ()=>fitDuplicatePdf(
        'incoming'
      );
}


if($('#duplicateCompareReject')){

  $('#duplicateCompareReject')
    .onclick=
      async ()=>{

        const reviewId=
          activeDuplicateCertificateReviewId;


        if(!reviewId){
          return;
        }


        const button=
          $('#duplicateCompareReject');


        button.disabled=true;
        button.textContent=
          'Rejecting…';


        try{

          await rejectDuplicateReview(
            reviewId
          );


          closeDuplicateCertificateCompare();


        }finally{

          button.disabled=false;
          button.textContent=
            'Yes — Reject Duplicate';
        }
      };
}


if($('#duplicateCompareKeep')){

  $('#duplicateCompareKeep')
    .onclick=
      async ()=>{

        const reviewId=
          activeDuplicateCertificateReviewId;


        if(!reviewId){
          return;
        }


        const button=
          $('#duplicateCompareKeep');


        button.disabled=true;
        button.textContent=
          'Keeping…';


        try{

          await keepDuplicateReview(
            reviewId
          );


          closeDuplicateCertificateCompare();


        }finally{

          button.disabled=false;
          button.textContent=
            'No — Keep Both';
        }
      };
}



/* ==========================================================
   TUTORING CLASS — SESSION / CHARGE ENTRY
   ========================================================== */

/*
 * Accounting rule:
 *
 * MONEY is authoritative.
 *
 * Session quantity is only a quick calculator:
 *     quantity × ratePerSession = charge amount
 *
 * A tutoring service's totalPrice is cumulative delivered
 * tutoring. Every tutoring entry also creates one dated
 * obligation so the existing certificate/payment allocator
 * can fund it normally.
 */

function tutoringClassForService(
  service
){

  if(!service?.classId){
    return null;
  }


  const classRecord=
    classes.find(
      item=>
        item.id===service.classId
    );


  return (
    classRecord?.classType==='Tutoring'
      ? classRecord
      : null
  );
}


function tutoringAvailableCredit(
  student
){

  const account=
    studentAccountTotals(
      student
    );


  return Math.max(
    0,
    -Number(
      account.parentBalance||0
    )
  );
}


async function recordTutoringSessionCharge(
  serviceId
){

  const service=
    services.find(
      item=>item.id===serviceId
    );


  if(!service){
    return;
  }


  const classRecord=
    tutoringClassForService(
      service
    );


  if(!classRecord){

    return toast(
      'This service is not linked to a tutoring class.'
    );
  }


  const student=
    students.find(
      item=>
        item.id===service.studentId
    );


  if(!student){
    return toast(
      'Student could not be found.'
    );
  }


  const rate=
    Number(
      classRecord.ratePerSession ||
      service.tutoringRate ||
      0
    );


  if(!(rate>0)){

    return toast(
      'Enter a rate per session in the tutoring class first.'
    );
  }


  const defaultDate=
    new Date()
      .toISOString()
      .slice(0,10);


  const date=
    prompt(
      `Service date for ${student.studentName}:`,
      defaultDate
    );


  if(!date){
    return;
  }


  const quantityText=
    prompt(
      `How many sessions?\n\n` +
      `Use decimals when needed — for example 0.5 for half a session.\n` +
      `${money(rate)} per normal session.`,
      '1'
    );


  if(
    quantityText===null ||
    quantityText.trim()===''
  ){
    return;
  }


  const quantity=
    Number(
      quantityText
    );


  if(
    !Number.isFinite(quantity) ||
    !(quantity>0)
  ){

    return toast(
      'Enter a session amount greater than zero.'
    );
  }


  const calculated=
    Number(
      (
        quantity*rate
      ).toFixed(2)
    );


  const amountText=
    prompt(
      `Charge amount for this tutoring entry:`,
      calculated.toFixed(2)
    );


  if(
    amountText===null ||
    amountText.trim()===''
  ){
    return;
  }


  const amount=
    Number(
      amountText
    );


  if(
    !Number.isFinite(amount) ||
    !(amount>0)
  ){

    return toast(
      'Enter a charge greater than zero.'
    );
  }


  const note=
    prompt(
      'Optional note for this tutoring entry:',
      ''
    );


  if(note===null){
    return;
  }


  const oldTotal=
    Math.max(
      0,
      Number(
        service.totalPrice||0
      )
    );


  const newTotal=
    Number(
      (
        oldTotal+amount
      ).toFixed(2)
    );


  const obligationRef=
    doc(
      sub('obligations')
    );


  const batch=
    writeBatch(db);


  batch.set(
    obligationRef,
    {
      studentId:
        student.id,

      studentName:
        student.studentName||'',

      serviceId:
        service.id,

      serviceName:
        service.name ||
        classRecord.name ||
        'Tutoring',

      classId:
        classRecord.id,

      className:
        classRecord.name||'Tutoring',

      obligationType:
        'Tutoring session',

      amount,

      originalAmount:
        amount,

      dueDate:
        date,

      serviceDate:
        date,

      sessionQuantity:
        quantity,

      ratePerSession:
        rate,

      sessionLengthMinutes:
        Number(
          classRecord.sessionLengthMinutes||60
        ),

      note:
        String(note||'').trim(),

      parentCreditedAmount:
        0,

      certificateCreditedAmount:
        0,

      creditedAmount:
        0,

      remainingAmount:
        amount,

      status:
        'Scheduled',

      source:
        'Tutoring entry',

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    }
  );


  batch.set(
    doc(
      db,
      'vendors',
      user.uid,
      'services',
      service.id
    ),
    {
      totalPrice:
        newTotal,

      tutoringRate:
        rate,

      sessionLengthMinutes:
        Number(
          classRecord.sessionLengthMinutes||60
        ),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  await batch.commit();


  await log(
    'Tutoring charge recorded',
    `${student.studentName} — `+
    `${quantity} session${quantity===1?'':'s'} — `+
    `${money(amount)} on ${date}`+
    `${note.trim()?` — ${note.trim()}`:''}.`,
    'Manual'
  );


  await refreshAll();


  toast(
    `${money(amount)} tutoring charge recorded.`
  );
}



/* ==========================================================
   PAYMENTS / CHARGES — MANUAL CHARGE ENTRY
   ========================================================== */

let selectedChargeStudentId=null;


function selectedChargeStudent(){

  return students.find(
    student=>
      student.id===selectedChargeStudentId
  ) || null;
}


function chargeStudentMatches(){

  const typed=
    String(
      $('#chargeStudent')?.value || ''
    ).trim();

  if(!typed){
    return [];
  }


  return paymentStudentMatches(
    typed
  )
    .map(
      match=>match.student
    )
    .filter(Boolean);
}


function refreshChargeServiceOptions(){

  const select=
    $('#chargeService');

  const student=
    selectedChargeStudent();

  if(!select){
    return;
  }


  if(!student){

    select.innerHTML=
      '<option value="">Choose service / class</option>';

    updateChargeSessionUI();

    return;
  }


  const list=
    studentServices(
      student.id
    )
      .filter(
        service=>
          service.status!=='Dropped' &&
          service.status!=='Removed'
      );


  select.innerHTML=
    '<option value="">Choose service / class</option>'+
    list.map(
      service=>`
        <option value="${esc(service.id)}">
          ${esc(service.name||service.className||service.serviceType||'Service')}
        </option>
      `
    ).join('');


  updateChargeSessionUI();
}


function selectChargeStudent(
  studentId
){

  const student=
    students.find(
      item=>item.id===studentId
    );

  if(!student){
    return;
  }


  selectedChargeStudentId=
    student.id;

  $('#chargeStudent').value=
    student.studentName||'';


  const box=
    $('#chargeStudentMatches');

  if(box){

    box.innerHTML='';
    hide(box);
  }


  refreshChargeServiceOptions();
}


function renderChargeStudentMatches(){

  const box=
    $('#chargeStudentMatches');

  if(!box){
    return;
  }


  const typed=
    $('#chargeStudent')?.value.trim() || '';

  if(!typed){

    box.innerHTML='';
    hide(box);
    return;
  }


  const matches=
    chargeStudentMatches();


  if(!matches.length){

    box.innerHTML=`
      <div class="vf-cert-student-no-match">
        <strong>No student found.</strong>
      </div>
    `;

    show(box);
    return;
  }


  box.innerHTML=
    matches.map(
      student=>`
        <button
          type="button"
          class="vf-charge-student-match"
          data-charge-student="${student.id}">

          <strong>
            ${esc(student.studentName||'Unnamed student')}
          </strong>

          <span>
            ${esc(student.parentName||'')}
            ${
              student.parentEmail
                ? ' · '+esc(student.parentEmail)
                : ''
            }
          </span>

        </button>
      `
    ).join('');


  $$('[data-charge-student]')
    .forEach(button=>{

      button.onclick=()=>{

        selectChargeStudent(
          button.dataset.chargeStudent
        );
      };
    });


  show(box);
}


function selectedChargeService(){

  const id=
    $('#chargeService')?.value || '';

  return services.find(
    service=>service.id===id
  ) || null;
}


function updateChargeSessionUI(){

  const wrap=
    $('#chargeSessionWrap');

  const hint=
    $('#chargeSessionHint');

  if(!wrap || !hint){
    return;
  }


  const service=
    selectedChargeService();

  const tutoringClass=
    service
      ? tutoringClassForService(service)
      : null;


  if(
    !tutoringClass ||
    !(Number(tutoringClass.ratePerSession)>0)
  ){

    hide(wrap);

    $('#chargeSessions').value='';

    hint.textContent='';

    return;
  }


  show(wrap);


  const rate=
    Number(
      tutoringClass.ratePerSession
    );


  hint.textContent=
    `${money(rate)} per normal `+
    `${Number(tutoringClass.sessionLengthMinutes||60)} minute session`;
}


function calculateChargeFromSessions(){

  const service=
    selectedChargeService();

  const tutoringClass=
    service
      ? tutoringClassForService(service)
      : null;

  const sessions=
    Number(
      $('#chargeSessions')?.value || 0
    );

  const rate=
    Number(
      tutoringClass?.ratePerSession || 0
    );


  if(
    sessions>0 &&
    rate>0
  ){

    $('#chargeAmount').value=
      (
        sessions*rate
      ).toFixed(2);
  }
}


function resetChargeForm(){

  selectedChargeStudentId=null;

  $('#chargeStudent').value='';

  $('#chargeDate').value=
    new Date()
      .toISOString()
      .slice(0,10);

  $('#chargeService').innerHTML=
    '<option value="">Choose service / class</option>';

  $('#chargeSessions').value='';
  $('#chargeAmount').value='';
  $('#chargeNote').value='';

  hide(
    $('#chargeStudentMatches')
  );

  hide(
    $('#chargeSessionWrap')
  );
}


function renderChargeRecords(){

  const list=
    $('#chargeList');

  if(!list){
    return;
  }


  const charges=
    obligations
      .filter(
        obligation=>
          !obligation.deleted &&
          (
            obligation.obligationType==='Manual charge' ||
            obligation.source==='Manual charge'
          )
      )
      .sort(
        (a,b)=>
          String(b.serviceDate||b.dueDate||'')
            .localeCompare(
              String(a.serviceDate||a.dueDate||'')
            )
      );


  list.innerHTML=
    charges.length
      ? charges.map(
          charge=>`
            <div class="record vf-charge-record">

              <strong>
                ${money(charge.amount)} — ${esc(charge.studentName||'Student')}
              </strong>

              <div class="meta">
                ${esc(charge.serviceDate||charge.dueDate||'')}
                ·
                ${esc(charge.serviceName||charge.className||'Service')}
                ${
                  charge.note
                    ? ' · '+esc(charge.note)
                    : ''
                }
              </div>

            </div>
          `
        ).join('')

      : '<div class="empty">No manual charges yet.</div>';
}


if($('#chargeStudent')){

  $('#chargeStudent')
    .addEventListener(
      'input',
      ()=>{

        selectedChargeStudentId=null;

        refreshChargeServiceOptions();

        renderChargeStudentMatches();
      }
    );


  $('#chargeStudent')
    .addEventListener(
      'focus',
      renderChargeStudentMatches
    );
}


if($('#chargeService')){

  $('#chargeService')
    .addEventListener(
      'change',
      updateChargeSessionUI
    );
}


if($('#chargeSessions')){

  $('#chargeSessions')
    .addEventListener(
      'input',
      calculateChargeFromSessions
    );
}


if($('#addCharge')){

  $('#addCharge').onclick=()=>{

    hide(
      $('#paymentForm')
    );

    hide(
      $('#refundForm')
    );

    resetChargeForm();

    show(
      $('#chargeForm')
    );

    $('#chargeStudent').focus();
  };
}


if($('#cancelCharge')){

  $('#cancelCharge').onclick=()=>{

    resetChargeForm();

    hide(
      $('#chargeForm')
    );
  };
}


if($('#saveCharge')){

  $('#saveCharge').onclick=async()=>{

    const student=
      selectedChargeStudent();


    if(!student){

      renderChargeStudentMatches();

      return toast(
        'Choose the student from the matching list.'
      );
    }


    const service=
      selectedChargeService();


    if(!service){

      return toast(
        'Choose the service or class for this charge.'
      );
    }


    const amount=
      Number(
        $('#chargeAmount').value
      );


    if(!(amount>0)){

      return toast(
        'Enter a charge amount.'
      );
    }


    const date=
      $('#chargeDate').value ||
      new Date()
        .toISOString()
        .slice(0,10);


    const note=
      $('#chargeNote').value.trim();


    const classRecord=
      service.classId
        ? classes.find(
            item=>item.id===service.classId
          )
        : null;


    const oldTotal=
      Number(
        service.totalPrice||0
      );


    const newTotal=
      Number(
        (
          oldTotal+amount
        ).toFixed(2)
      );


    const obligationRef=
      doc(
        sub('obligations')
      );


    const batch=
      writeBatch(db);


    batch.set(
      obligationRef,
      {
        studentId:
          student.id,

        studentName:
          student.studentName||'',

        serviceId:
          service.id,

        serviceName:
          service.name ||
          service.className ||
          classRecord?.name ||
          'Service',

        classId:
          service.classId || '',

        className:
          classRecord?.name ||
          service.className ||
          '',

        obligationType:
          'Manual charge',

        amount,

        originalAmount:
          amount,

        dueDate:
          date,

        serviceDate:
          date,

        note,

        parentCreditedAmount:
          0,

        certificateCreditedAmount:
          0,

        creditedAmount:
          0,

        remainingAmount:
          amount,

        status:
          'Scheduled',

        source:
          'Manual charge',

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    batch.set(
      doc(
        db,
        'vendors',
        user.uid,
        'services',
        service.id
      ),
      {
        totalPrice:
          newTotal,

        updatedAt:
          serverTimestamp()
      },
      {
        merge:true
      }
    );


    await batch.commit();


    await log(
      'Charge recorded',
      `${student.studentName} — `+
      `${money(amount)} — `+
      `${service.name||service.className||classRecord?.name||'Service'}`+
      `${note?' — '+note:''}.`,
      'Manual'
    );


    resetChargeForm();

    hide(
      $('#chargeForm')
    );


    await refreshAll();


    toast(
      `${money(amount)} charge recorded.`
    );
  };
}




/* ==========================================================
   PAYMENT STATEMENT REVIEW
   ========================================================== */


let paymentStatementResult=null;


function paymentStatementEsc(value){

  return esc(
    String(
      value ?? ''
    )
  );
}


function paymentStatementMatchText(value){

  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}


function paymentStatementContainsExactName(
  text,
  name
){

  const normalizedText=
    paymentStatementMatchText(text);

  const normalizedName=
    paymentStatementMatchText(name);


  if(!normalizedText || !normalizedName){
    return false;
  }


  return (
    ` ${normalizedText} `
      .includes(
        ` ${normalizedName} `
      )
  );
}


function paymentStatementMatchDetails(tx){

  const payer=
    paymentStatementMatchText(
      tx?.payer
    );

  const memo=
    [
      tx?.memo,
      tx?.description
    ]
      .filter(Boolean)
      .join(' ');


  /*
   * First choice:
   * an exact complete student name appears in the memo.
   */
  const memoMatches=
    students.filter(student=>
      paymentStatementContainsExactName(
        memo,
        student.studentName
      )
    );


  if(memoMatches.length===1){

    return {
      student:
        memoMatches[0],

      label:
        'Student name in memo',

      matchedBy:
        'VendorFlow exact student-name memo match'
    };
  }


  /*
   * If more than one roster record has the same student
   * name, use the exact payer/parent name only to resolve
   * that ambiguity.
   */
  if(memoMatches.length>1 && payer){

    const memoAndParentMatches=
      memoMatches.filter(student=>
        paymentStatementMatchText(
          student.parentName
        )===payer
      );


    if(memoAndParentMatches.length===1){

      return {
        student:
          memoAndParentMatches[0],

        label:
          'Student memo + parent match',

        matchedBy:
          'VendorFlow exact memo and parent match'
      };
    }


    return null;
  }


  /*
   * Second choice:
   * the payer exactly matches one and only one student
   * or parent roster identity.
   *
   * If one parent has multiple children, VendorFlow does
   * not guess which child should receive the payment.
   */
  if(payer){

    const payerMatches=
      students.filter(student=>{

        const studentName=
          paymentStatementMatchText(
            student.studentName
          );

        const parentName=
          paymentStatementMatchText(
            student.parentName
          );


        return (
          studentName===payer ||
          parentName===payer
        );
      });


    if(payerMatches.length===1){

      return {
        student:
          payerMatches[0],

        label:
          'Exact parent/payer match',

        matchedBy:
          'VendorFlow exact statement payer match'
      };
    }
  }


  return null;
}


function paymentStatementStudentMatch(tx){

  return (
    paymentStatementMatchDetails(tx)
      ?.student ||
    null
  );
}


function paymentStatementMatchLabel(tx){

  return (
    paymentStatementMatchDetails(tx)
      ?.label ||
    ''
  );
}


function statementIgnoredPayerKey(value){

  return paymentStatementMatchText(
    value
  );
}


function statementIgnoredMethodKey(value){

  return paymentStatementMatchText(
    value
  );
}


function statementPayerIgnoreRule(tx){

  const payerKey=
    statementIgnoredPayerKey(
      tx?.payer
    );

  const methodKey=
    statementIgnoredMethodKey(
      tx?.method
    );


  if(!payerKey){
    return null;
  }


  return (
    ignoredStatementPayers.find(rule=>
      rule.payerKey===payerKey &&
      rule.methodKey===methodKey
    ) ||
    null
  );
}


function statementPayerIsIgnored(tx){

  return Boolean(
    statementPayerIgnoreRule(tx)
  );
}


async function saveIgnoredStatementPayer(
  tx
){

  const payer=
    String(tx?.payer||'').trim();

  const method=
    String(tx?.method||'').trim() ||
    'Other';

  const payerKey=
    statementIgnoredPayerKey(payer);

  const methodKey=
    statementIgnoredMethodKey(method);


  if(!payerKey){
    toast(
      'This transaction has no payer name to ignore.'
    );

    return false;
  }


  const existing=
    ignoredStatementPayers.find(rule=>
      rule.payerKey===payerKey &&
      rule.methodKey===methodKey
    );


  if(existing){
    return true;
  }


  const approved=
    window.confirm(
      `Always ignore transactions from ${payer} `+
      `in future ${method} statement imports?\n\n`+
      `They will remain visible, but VendorFlow will `+
      `leave them unchecked.`
    );


  if(!approved){
    return false;
  }


  const rule={

    payer,

    payerKey,

    method,

    methodKey,

    createdAt:
      new Date().toISOString()
  };


  const updatedRules=[
    ...ignoredStatementPayers,
    rule
  ];


  await setDoc(
    vendorDoc(),
    {
      ignoredStatementPayers:
        updatedRules,

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  ignoredStatementPayers=
    updatedRules;


  await log(
    'Statement payer ignored',
    `${payer} will be ignored in future ${method} statement imports.`,
    'Manual'
  );


  return true;
}


async function removeIgnoredStatementPayer(
  tx
){

  const rule=
    statementPayerIgnoreRule(tx);


  if(!rule){
    return;
  }


  const approved=
    window.confirm(
      `Stop automatically ignoring ${rule.payer} `+
      `in ${rule.method} statement imports?`
    );


  if(!approved){
    return;
  }


  const updatedRules=
    ignoredStatementPayers.filter(
      item=>
        !(
          item.payerKey===rule.payerKey &&
          item.methodKey===rule.methodKey
        )
    );


  await setDoc(
    vendorDoc(),
    {
      ignoredStatementPayers:
        updatedRules,

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  ignoredStatementPayers=
    updatedRules;


  await log(
    'Statement payer restored',
    `${rule.payer} will no longer be automatically ignored in ${rule.method} statement imports.`,
    'Manual'
  );


  renderPaymentStatementResults();


  toast(
    `${rule.payer} will no longer be ignored.`
  );
}


function paymentStatementStudentOptions(
  selectedId=''
){

  const sorted=
    [...students]
      .sort(
        (a,b)=>
          String(a.studentName||'')
            .localeCompare(
              String(b.studentName||'')
            )
      );


  return `
    <option value="__VF_IGNORE_PAYER__">
      Always Ignore This Payer
    </option>

    <option
      value=""
      ${selectedId ? '' : 'selected'}>
      Match with Student
    </option>

    ${
      sorted.map(student=>`

        <option
          value="${paymentStatementEsc(student.id)}"
          ${
            student.id===selectedId
              ? 'selected'
              : ''
          }>

          ${paymentStatementEsc(
            student.studentName ||
            'Unnamed student'
          )}

          ${
            student.parentName
              ? ` — ${paymentStatementEsc(
                  student.parentName
                )}`
              : ''
          }

        </option>

      `).join('')
    }
  `;
}


function selectedPaymentStatementRows(){

  return Array.from(
    document.querySelectorAll(
      '.vf-statement-select:checked'
    )
  )
    .filter(
      checkbox=>
        !checkbox.disabled
    );
}


function updatePaymentStatementImportButton(){

  const button=
    $('#importSelectedStatementPayments');

  if(!button){
    return;
  }


  const count=
    selectedPaymentStatementRows().length;


  button.textContent=
    `Import Selected Payment${
      count===1 ? '' : 's'
    } (${count})`;

  button.disabled=
    count===0;
}


function selectVendorFlowStatementPayments(){

  if(
    !paymentStatementResult ||
    !Array.isArray(
      paymentStatementResult.transactions
    )
  ){
    return;
  }


  paymentStatementResult.transactions
    .forEach((tx,index)=>{

      const checkbox=
        document.querySelector(
          `.vf-statement-select[data-statement-index="${index}"]`
        );

      if(!checkbox || checkbox.disabled){
        return;
      }


      const matchedStudent=
        paymentStatementStudentMatch(tx);


      checkbox.checked=
        Boolean(
          tx.direction==='incoming' &&
          !tx.needsReview &&
          matchedStudent &&
          !statementPayerIsIgnored(tx) &&
          !tx._imported &&
          !tx._duplicateQueued
        );


      if(matchedStudent){

        const select=
          document.querySelector(
            `.vf-statement-student[data-statement-index="${index}"]`
          );

        if(select && !select.value){
          select.value=
            matchedStudent.id;
        }
      }
    });


  updatePaymentStatementImportButton();
}


function installPaymentStatementReviewControls(){

  document
    .querySelectorAll(
      '.vf-statement-select'
    )
    .forEach(checkbox=>{

      checkbox.addEventListener(
        'change',
        updatePaymentStatementImportButton
      );
    });


  document
    .querySelectorAll(
      '.vf-statement-student'
    )
    .forEach(select=>{

      select.addEventListener(
        'change',
        async ()=>{

          const index=
            Number(
              select.dataset.statementIndex
            );

          const tx=
            paymentStatementResult
              ?.transactions?.[index];

          const checkbox=
            document.querySelector(
              `.vf-statement-select[data-statement-index="${index}"]`
            );


          if(
            select.value===
              '__VF_IGNORE_PAYER__'
          ){

            select.disabled=true;


            try{

              const saved=
                await saveIgnoredStatementPayer(
                  tx
                );


              if(saved){

                if(tx){
                  tx._importError='';
                }


                renderPaymentStatementResults();


                toast(
                  `${tx?.payer||'Payer'} will be ignored in future imports.`
                );

                return;
              }


              select.value=
                paymentStatementStudentMatch(tx)
                  ?.id ||
                '';


            }catch(error){

              console.error(
                'Could not save ignored payer:',
                error
              );


              select.value=
                paymentStatementStudentMatch(tx)
                  ?.id ||
                '';


              toast(
                'VendorFlow could not save that ignored payer.'
              );


            }finally{

              if(
                document.body.contains(
                  select
                )
              ){
                select.disabled=false;
              }
            }


            updatePaymentStatementImportButton();

            return;
          }


          if(
            checkbox &&
            select.value &&
            !checkbox.disabled
          ){
            checkbox.checked=true;
          }


          updatePaymentStatementImportButton();
        }
      );
    });


  document
    .querySelectorAll(
      '[data-stop-ignoring-statement-payer]'
    )
    .forEach(button=>{

      button.addEventListener(
        'click',
        async ()=>{

          const index=
            Number(
              button.dataset
                .stopIgnoringStatementPayer
            );

          const tx=
            paymentStatementResult
              ?.transactions?.[index];


          button.disabled=true;


          try{

            await removeIgnoredStatementPayer(
              tx
            );

          }catch(error){

            console.error(
              'Could not remove ignored payer:',
              error
            );


            button.disabled=false;


            toast(
              'VendorFlow could not remove that ignored-payer rule.'
            );
          }
        }
      );
    });


  const selectAllButton=
    $('#selectStatementPayments');

  if(selectAllButton){

    selectAllButton.onclick=
      selectVendorFlowStatementPayments;
  }


  const importButton=
    $('#importSelectedStatementPayments');

  if(importButton){

    importButton.onclick=
      importSelectedStatementPayments;
  }


  updatePaymentStatementImportButton();
}


async function importSelectedStatementPayments(){

  if(
    !paymentStatementResult ||
    !Array.isArray(
      paymentStatementResult.transactions
    )
  ){
    return;
  }


  const selected=
    selectedPaymentStatementRows();


  if(!selected.length){

    toast(
      'Select at least one payment.'
    );

    return;
  }


  const button=
    $('#importSelectedStatementPayments');

  const status=
    $('#paymentStatementStatus');


  if(button){
    button.disabled=true;
    button.textContent='Importing…';
  }


  let imported=0;
  let duplicates=0;
  let skipped=0;
  let needsMatch=0;


  try{

    for(const checkbox of selected){

      const index=
        Number(
          checkbox.dataset.statementIndex
        );

      const tx=
        paymentStatementResult
          .transactions[index];


      if(
        !tx ||
        tx._imported ||
        tx._duplicateQueued
      ){
        skipped++;
        continue;
      }


      if(tx.direction==='outgoing'){

        tx._importError=
          'Outgoing transactions cannot be imported as payments.';

        skipped++;
        continue;
      }


      const studentSelect=
        document.querySelector(
          `.vf-statement-student[data-statement-index="${index}"]`
        );

      const studentId=
        studentSelect?.value || '';

      const student=
        students.find(
          item=>item.id===studentId
        );


      if(!student){

        tx._importError=
          'Choose the correct student before importing.';

        needsMatch++;
        continue;
      }


      const amount=
        Math.abs(
          Number(tx.amount||0)
        );


      if(!amount){

        tx._importError=
          'This transaction does not have a valid payment amount.';

        skipped++;
        continue;
      }


      const payment={

        date:
          String(tx.date||'').trim() ||
          new Date()
            .toISOString()
            .slice(0,10),

        payer:
          String(tx.payer||'').trim() ||
          student.parentName ||
          '',

        studentId:
          student.id,

        student:
          student.studentName||'',

        parentName:
          student.parentName||'',

        parentEmail:
          student.parentEmail||'',

        className:'',

        amount,

        method:
          String(tx.method||'').trim() ||
          'Other',

        memo:
          String(
            tx.memo ||
            tx.description ||
            ''
          ).trim(),

        source:
          'Payment statement',

        matchedBy:
          paymentStatementStudentMatch(tx)?.id===
            student.id
              ? (
                  paymentStatementMatchDetails(tx)
                    ?.matchedBy ||
                  'VendorFlow exact statement match'
                )
              : 'Vendor statement selection',

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      };


      const duplicatePayment=
        findDuplicatePayment(payment);


      if(duplicatePayment){

        await queueDuplicateReview(
          'payment',
          payment,
          duplicatePayment
        );

        tx._duplicateQueued=true;
        tx._importError='';

        duplicates++;
        continue;
      }


      const paymentRef=
        await addDoc(
          sub('payments'),
          payment
        );


      /*
       * Keep the local duplicate list current during this batch.
       * This prevents two identical selected rows from both posting.
       */
      payments.push({
        ...payment,
        id:paymentRef.id
      });


      await log(
        'Payment imported from statement',
        `${student.studentName} — `+
        `${money(amount)} via ${payment.method}.`,
        'Statement import',
        {
          type:'payment',
          id:paymentRef.id
        }
      );


      tx._imported=true;
      tx._importError='';

      imported++;
    }


    await refreshAll();

    renderPaymentStatementResults();


    const resultParts=[
      `${imported} imported`
    ];


    if(duplicates){
      resultParts.push(
        `${duplicates} duplicate${
          duplicates===1?'':'s'
        } sent to review`
      );
    }


    if(needsMatch){
      resultParts.push(
        `${needsMatch} needing a student match`
      );
    }


    if(skipped){
      resultParts.push(
        `${skipped} skipped`
      );
    }


    const resultText=
      resultParts.join(' · ');


    if(status){
      status.textContent=
        `Statement import finished: ${resultText}.`;
    }


    toast(
      `Statement import finished: ${resultText}.`
    );


  }catch(error){

    console.error(
      'Statement payment import failed:',
      error
    );


    if(status){
      status.textContent=
        `Import stopped: ${error.message}`;
    }


    toast(
      'The statement import stopped. Review the results before trying again.'
    );


    renderPaymentStatementResults();


  }finally{

    updatePaymentStatementImportButton();
  }
}


function renderPaymentStatementResults(){

  const target=
    $('#paymentStatementResults');

  if(!target){
    return;
  }


  if(
    !paymentStatementResult ||
    !Array.isArray(
      paymentStatementResult.transactions
    )
  ){

    target.innerHTML='';
    return;
  }


  const data=
    paymentStatementResult;

  const rows=
    data.transactions;

  const incoming=
    rows.filter(
      tx=>tx.direction==='incoming'
    );

  const uncertain=
    rows.filter(
      tx=>
        tx.direction==='uncertain' ||
        tx.needsReview
    );

  const imported=
    rows.filter(
      tx=>tx._imported
    );


  target.innerHTML=`

    <div class="vf-statement-summary">

      <strong>
        ${paymentStatementEsc(
          data.institution ||
          data.statementType ||
          'Statement'
        )}
      </strong>

      <span>
        ${rows.length} transaction${rows.length===1?'':'s'} found
        · ${incoming.length} incoming
        · ${uncertain.length} needing attention
        ${
          imported.length
            ? ` · ${imported.length} imported`
            : ''
        }
      </span>

      ${
        data.periodStart || data.periodEnd
          ? `<span>
               ${paymentStatementEsc(data.periodStart)}
               ${
                 data.periodStart && data.periodEnd
                   ? ' – '
                   : ''
               }
               ${paymentStatementEsc(data.periodEnd)}
             </span>`
          : ''
      }

    </div>

    <div class="vf-statement-review-toolbar">

      <div>
        <strong>Review payments before importing</strong>
        <span>
          VendorFlow selects only clear incoming payments with an exact family match.
        </span>
      </div>

      <div class="vf-statement-review-actions">

        <button
          id="selectStatementPayments"
          type="button"
          class="secondary">
          Select All VF-Identified Payments
        </button>

        <button
          id="importSelectedStatementPayments"
          type="button"
          class="primary"
          disabled>
          Import Selected Payments (0)
        </button>

      </div>

    </div>

    <div class="vf-statement-table-wrap">

      <table class="vf-statement-table">

        <thead>
          <tr>
            <th class="vf-statement-check-column">
              Import
            </th>
            <th>Status</th>
            <th>Date</th>
            <th>Payer</th>
            <th>Student</th>
            <th>Description / memo</th>
            <th>Method</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>

          ${
            rows.length
              ? rows.map((tx,index)=>{

                  const matchedStudent=
                    paymentStatementStudentMatch(tx);

                  const outgoing=
                    tx.direction==='outgoing';

                  const ignored=
                    statementPayerIsIgnored(tx);

                  const unavailable=
                    outgoing ||
                    ignored ||
                    tx._imported ||
                    tx._duplicateQueued;

                  const vfSelected=
                    Boolean(
                      tx.direction==='incoming' &&
                      !tx.needsReview &&
                      matchedStudent &&
                      !unavailable
                    );


                  let status=
                    tx.direction==='incoming'
                      ? (
                          tx.needsReview
                            ? 'Review'
                            : 'Incoming'
                        )
                      : (
                          outgoing
                            ? 'Outgoing'
                            : 'Uncertain'
                        );


                  if(tx._imported){
                    status='Imported';
                  }else if(tx._duplicateQueued){
                    status='Duplicate review';
                  }else if(ignored){
                    status='Ignored payer';
                  }


                  const rowClass=
                    tx._imported
                      ? 'vf-statement-imported'
                      : (
                          tx._duplicateQueued
                            ? 'vf-statement-duplicate'
                            : (
                                ignored
                                  ? 'vf-statement-ignored'
                                  : (
                                      tx.direction==='incoming' &&
                                      !tx.needsReview
                                        ? 'vf-statement-incoming'
                                        : (
                                            outgoing
                                              ? 'vf-statement-outgoing'
                                              : 'vf-statement-review'
                                          )
                                    )
                              )
                        );


                  return `
                    <tr class="${rowClass}">

                      <td class="vf-statement-check-column">

                        <input
                          type="checkbox"
                          class="vf-statement-select"
                          data-statement-index="${index}"
                          aria-label="Import this transaction"
                          ${vfSelected?'checked':''}
                          ${unavailable?'disabled':''}>

                      </td>

                      <td>
                        <strong>
                          ${paymentStatementEsc(status)}
                        </strong>

                        ${
                          ignored
                            ? `<button
                                 type="button"
                                 class="vf-stop-ignoring-payer"
                                 data-stop-ignoring-statement-payer="${index}">
                                 Stop ignoring
                               </button>`
                            : ''
                        }

                        ${
                          tx._importError
                            ? `<div class="vf-statement-row-warning">
                                 ${paymentStatementEsc(
                                   tx._importError
                                 )}
                               </div>`
                            : ''
                        }
                      </td>

                      <td>
                        ${paymentStatementEsc(tx.date)}
                      </td>

                      <td>
                        ${paymentStatementEsc(tx.payer)}
                      </td>

                      <td>

                        ${
                          unavailable
                            ? paymentStatementEsc(
                                ignored
                                  ? 'Always ignored'
                                  : (
                                      matchedStudent?.studentName ||
                                      (
                                        tx._imported
                                          ? 'Imported'
                                          : ''
                                      )
                                    )
                              )
                            : `
                                <select
                                  class="input vf-statement-student"
                                  data-statement-index="${index}"
                                  aria-label="Student for this payment">

                                  ${paymentStatementStudentOptions(
                                    matchedStudent?.id || ''
                                  )}

                                </select>
                              `
                        }

                        ${
                          matchedStudent &&
                          !tx._imported &&
                          !tx._duplicateQueued
                            ? `<div class="vf-statement-match-note">
                                 ${paymentStatementEsc(
                                   paymentStatementMatchLabel(tx) ||
                                   'VF exact match'
                                 )}
                               </div>`
                            : (
                                !outgoing &&
                                !tx._imported &&
                                !tx._duplicateQueued
                                  ? `<div class="vf-statement-row-warning">
                                       Student match required
                                     </div>`
                                  : ''
                              )
                        }

                      </td>

                      <td>
                        ${paymentStatementEsc(
                          tx.memo ||
                          tx.description
                        )}
                      </td>

                      <td>
                        ${paymentStatementEsc(tx.method)}
                      </td>

                      <td class="right">
                        ${money(
                          Math.abs(
                            Number(tx.amount||0)
                          )
                        )}
                      </td>

                    </tr>
                  `;
                }).join('')
              : `
                  <tr>
                    <td colspan="8">
                      No transactions were extracted.
                    </td>
                  </tr>
                `
          }

        </tbody>

      </table>

    </div>

    <div class="vf-statement-safety-note">
      Only checked payments are imported. Outgoing transactions cannot be imported as payments.
    </div>
  `;


  installPaymentStatementReviewControls();
}


async function readPaymentStatement(){

  const fileInput=
    $('#paymentStatementFile');

  const status=
    $('#paymentStatementStatus');


  if(
    !fileInput ||
    !fileInput.files ||
    !fileInput.files[0]
  ){

    toast(
      'Choose a statement PDF first.'
    );

    return;
  }


  const file=
    fileInput.files[0];


  const lowerName=
    String(
      file.name || ''
    )
      .toLowerCase();


  const lowerType=
    String(
      file.type || ''
    )
      .toLowerCase();


  const supported=
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.csv') ||
    lowerType==='application/pdf' ||
    lowerType.includes('csv');


  if(!supported){

    toast(
      'Please choose a PDF or CSV statement.'
    );

    return;
  }


  const user=
    auth.currentUser;


  if(!user){

    toast(
      'Please sign in again.'
    );

    return;
  }


  const button=
    $('#readPaymentStatement');


  if(button){
    button.disabled=true;
    button.textContent='Reading…';
  }


  if(status){
    status.textContent=
      'Reading statement…';
  }


  paymentStatementResult=null;
  renderPaymentStatementResults();


  try{

    const token=
      await user.getIdToken();


    const form=
      new FormData();

    form.append(
      'file',
      file,
      file.name
    );


    const response=
      await fetch(
        `${VENDORFLOW_API}/payment-statement/extract`,
        {
          method:'POST',

          headers:{
            Authorization:
              `Bearer ${token}`
          },

          body:
            form
        }
      );


    let data={};


    try{
      data=
        await response.json();
    }catch{}


    if(!response.ok){

      throw new Error(
        data?.detail ||
        data?.error ||
        `Statement reader returned ${response.status}.`
      );
    }


    paymentStatementResult=
      data;


    renderPaymentStatementResults();


    if(status){

      status.textContent=
        `Finished reading ${file.name}.`;
    }


    toast(
      'Statement read. Nothing has been imported.'
    );


  }catch(error){

    console.error(
      'Payment statement read failed:',
      error
    );


    if(status){

      status.textContent=
        `Could not read statement: ${error.message}`;
    }


    toast(
      'VendorFlow could not read that statement.'
    );


  }finally{

    if(button){
      button.disabled=false;
      button.textContent='Read statement';
    }
  }
}


const paymentStatementButton=
  $('#readPaymentStatement');

if(paymentStatementButton){

  paymentStatementButton.onclick=
    readPaymentStatement;
}




/* ==========================================================
   PAYMENTS / CHARGES ACTION CHOOSER
   ========================================================== */


function vfButtonByExactText(text){

  return Array.from(
    document.querySelectorAll(
      'button'
    )
  )
    .find(
      button=>
        button.textContent
          .trim()
          .toLowerCase()===
        String(text)
          .trim()
          .toLowerCase()
    ) ||
    null;
}


function closePaymentActionChooser(){

  const chooser=
    $('#paymentActionChooser');

  if(chooser){
    chooser.hidden=true;
  }
}


function hidePaymentStatementWorkspace(){

  const workspace=
    $('#paymentStatementWorkspace');

  if(workspace){
    workspace.hidden=true;
  }
}


function showPaymentStatementWorkspace(){

  const workspace=
    $('#paymentStatementWorkspace');

  if(workspace){
    workspace.hidden=false;

    workspace.scrollIntoView({
      behavior:'smooth',
      block:'nearest'
    });
  }
}


/*
 * Preserve the old proven buttons as internal triggers.
 * They remain functional but are no longer part of the UX.
 */
[
  'Refund',
  'Add charge',
  'Add family payment'
]
  .forEach(label=>{

    const button=
      vfButtonByExactText(
        label
      );

    if(button){

      button.classList.add(
        'vf-hidden-legacy-payment-action'
      );
    }
  });


const paymentActionLauncher=
  $('#openPaymentActionChooser');

if(paymentActionLauncher){

  paymentActionLauncher.onclick=()=>{

    const chooser=
      $('#paymentActionChooser');

    if(!chooser){
      return;
    }

    chooser.hidden=
      !chooser.hidden;
  };
}


const closePaymentChooserButton=
  $('#closePaymentActionChooser');

if(closePaymentChooserButton){

  closePaymentChooserButton.onclick=
    closePaymentActionChooser;
}


$$('[data-payment-choice]')
  .forEach(button=>{

    button.onclick=()=>{

      const choice=
        button.dataset.paymentChoice;


      closePaymentActionChooser();


      if(
        choice!=='statement'
      ){

        hidePaymentStatementWorkspace();
      }


      if(
        choice==='statement'
      ){

        showPaymentStatementWorkspace();
        return;
      }


      const legacyLabel=
        choice==='family'
          ? 'Add family payment'
          : (
              choice==='charge'
                ? 'Add charge'
                : (
                    choice==='refund'
                      ? 'Refund'
                      : ''
                  )
            );


      const legacyButton=
        vfButtonByExactText(
          legacyLabel
        );


      if(!legacyButton){

        toast(
          'VendorFlow could not open that entry form.'
        );

        return;
      }


      legacyButton.click();
    };
  });


