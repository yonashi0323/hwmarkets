/* Email links are verified only after a deliberate form submission on auth.html. */
(()=>{
  'use strict';
  const EMAIL_KEY='hwmarkets-login-email';
  const byId=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const userIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';
  const readEmail=()=>{try{return sessionStorage.getItem(EMAIL_KEY)||'';}catch{return '';}};
  const rememberEmail=email=>{try{sessionStorage.setItem(EMAIL_KEY,email);}catch{}};
  const forgetEmail=()=>{try{sessionStorage.removeItem(EMAIL_KEY);}catch{}};
  const emailValue=input=>input.value.trim();
  const errorText=error=>{
    if(error.status===429)return `送信・確認の回数が多くなっています。${error.retryAfter?`${error.retryAfter}秒ほど待ってから、`:'少し時間をおいてから、'}もう一度お試しください。`;
    if(error.status===401||error.status===409)return 'ログインの状態が変わりました。もう一度メールからログインしてください。';
    if(error.status===503)return '現在、アカウント機能を利用できません。時間をおいてお試しください。';
    if(error.status===400)return '入力内容を確認してください。認証リンクは有効期限内の新しいものをお使いください。';
    return '通信を確認できませんでした。接続を確認して、もう一度お試しください。';
  };
  async function api(body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch('/api/account',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:body?{'Content-Type':'application/json','Accept':'application/json'}:{'Accept':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
      let data;try{data=await response.json();}catch{throw Object.assign(new Error('Invalid account response'),{status:response.status===200?503:response.status});}
      if(!response.ok){const seconds=Number(response.headers.get('Retry-After'));throw Object.assign(new Error('Account request failed'),{status:response.status,code:data?.error?.code,retryAfter:Number.isFinite(seconds)&&seconds>0?Math.min(Math.ceil(seconds),3600):null});}
      return data;
    }finally{clearTimeout(timer);}
  }
  function validSession(data){
    if(!data||typeof data.configured!=='boolean')throw new Error('Invalid account response');
    if(data.user!==null&&(!data.user||typeof data.user.id!=='string'||!data.user.id||typeof data.user.email!=='string'))throw new Error('Invalid account response');
    return data;
  }
  function formMarkup(id,email,buttonLabel){return `<form id="${id}" class="hw-account-form"><label class="hw-account-label" for="${id}Email">メールアドレス</label><input class="hw-account-input" id="${id}Email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="you@example.com" value="${escape(email)}"><button class="button button-primary" type="submit">${buttonLabel}</button></form>`;}

  const authContent=byId('authContent');
  if(authContent){
    let token=typeof window.HWAuthCallback?.token==='string'?window.HWAuthCallback.token:'';
    const signup=window.HWAuthCallback?.mode==='signup',completion=signup?'登録を完了':'ログインを完了';
    try{delete window.HWAuthCallback;}catch{window.HWAuthCallback=undefined;}
    if(!token){
      authContent.innerHTML='<div class="eyebrow">HELLO WORLD MARKETS</div><h1>新しい認証リンクが必要です</h1><p class="hw-account-lead">このページには有効な認証リンクがありません。ホームからメールを送信し、届いたリンクを開いてください。</p><a class="button button-primary" href="/#account">ログイン画面へ</a>';
      return;
    }
    authContent.innerHTML='<div class="eyebrow">WELCOME TO YOUR WORKSPACE</div><h1>'+completion+'</h1><p class="hw-account-lead">このリンクを送信したメールアドレスを確認してください。下のボタンを押すと、'+(signup?'新規登録':'ログイン')+'が完了します。</p>'+formMarkup('authVerifyForm',readEmail(),completion)+'<p id="authMessage" class="hw-account-status" role="status"></p><p class="hw-account-privacy">本人確認にはDescopeを利用します。<a href="https://www.descope.com/privacy" target="_blank" rel="noopener noreferrer">プライバシーポリシー ↗</a><br><a href="/'+(signup?'#signup':'#account')+'">新しい認証リンクを受け取る</a></p>';
    let verifying=false;
    byId('authVerifyForm').addEventListener('submit',async event=>{
      event.preventDefault();if(verifying||!token)return;
      const form=event.currentTarget,email=emailValue(byId('authVerifyFormEmail'));
      if(!form.reportValidity())return;
      verifying=true;const button=form.querySelector('button');button.disabled=true;button.textContent='ログインしています…';
      const message=byId('authMessage');message.classList.remove('is-error');message.textContent='認証リンクを確認しています。';
      try{
        const result=validSession(await api({action:'verify',token,email}));
        if(!result.user)throw Object.assign(new Error('No verified user'),{status:401});
        token='';forgetEmail();
        authContent.innerHTML='<div class="eyebrow">WELCOME TO YOUR WORKSPACE</div><h1>'+(signup?'登録が完了しました':'ログインしました')+'</h1><p class="hw-account-lead"><strong>'+escape(result.user.email)+'</strong> のアカウントで利用できます。</p><a class="button button-primary" href="/#account">マイマーケットへ進む</a><p class="hw-account-hint">ボードやお気に入りは、アカウント画面で確認できます。</p>';
        authContent.querySelector('a.button').focus();
      }catch(error){
        message.classList.add('is-error');message.textContent=error.status===400||error.status===401?'認証リンクを確認できませんでした。メールアドレスを確認し、新しいリンクを受け取ってください。':errorText(error);
        button.disabled=false;button.textContent=completion;
      }finally{verifying=false;}
    });
    return;
  }

  const dialog=byId('accountDialog'),content=byId('accountContent'),accountButton=byId('accountButton');
  const signupButton=byId('signupButton');
  if(!dialog||!content||!accountButton)return;
  const workspace=window.HWWorkspace;
  let session={configured:null,user:null,cloudEnabled:false},generation=0,readSequence=0,mutationBusy=false,loading=false;
  let authMode=location.hash==='#signup'?'signup':'login',formState='email',notice='',noticeError=false,syncReady=false,syncState='idle',syncMessage='',pendingPreferences=null;
  let saveTimer,saveRunning=false,needsExplicitSave=false,preferenceRevision=0,draftEmail=readEmail();
  const cancelWrites=()=>{clearTimeout(saveTimer);pendingPreferences=null;saveRunning=false;needsExplicitSave=false;};
  function render(){
    const user=session.user;
    const signup=authMode==='signup';
    accountButton.classList.toggle('is-signed-in',Boolean(user));
    accountButton.setAttribute('aria-label',user?`アカウント：${user.email}`:'ログイン');
    if(signupButton)signupButton.hidden=Boolean(user);
    byId('accountButtonLabel').textContent=user?'アカウント':'ログイン';
    byId('accountTitle').textContent=user?'マイアカウント':signup?'新規登録':'ログイン';
    if(session.configured===null){content.innerHTML='<p class="hw-account-lead">アカウントを確認しています…</p>';return;}
    if(!session.configured){
      content.innerHTML='<p class="hw-account-lead">アカウント登録の準備中です。</p><div class="hw-account-message">現在はログイン機能を利用できません。マーケットや、このブラウザのウォッチリストは引き続き利用できます。</div><button class="hw-account-secondary" id="accountRetry">もう一度確認</button>';
      byId('accountRetry').addEventListener('click',()=>loadSession(true));return;
    }
    if(user){
      const cloud=session.cloudEnabled===true;
      content.innerHTML='<div class="hw-account-profile"><span class="hw-account-profile-icon">'+userIcon+'</span><div><small>SIGNED IN</small><strong>'+escape(user.email)+'</strong></div></div><div class="hw-account-card"><h3>'+(cloud?'あなたのマーケット設定':'このブラウザのマーケット設定')+'</h3><p>'+(cloud?'ボード・お気に入り・表示設定をアカウントに保存します。ログアウトすると、ゲストのボードに戻ります。':'アカウントごとの設定をこのブラウザに保存します。現在、別の端末への同期は利用できません。')+'</p><p class="hw-account-status '+(syncState==='error'?'is-error':'')+'" id="accountSyncStatus" role="status">'+escape(syncMessage||(cloud?'設定を確認しています…':'設定はこの端末に保存されます。'))+'</p>'+(cloud&&(syncState==='error'||needsExplicitSave)?'<button class="button" id="accountSyncRetry" type="button">'+(needsExplicitSave?'このブラウザの変更を保存':'もう一度同期を確認')+'</button>':'')+'</div><div class="hw-account-card" style="margin-top:12px"><h3>ゲストの設定を使う</h3><p>ログイン前に、このブラウザで使っていたボードとお気に入りを引き継げます。現在のアカウント設定が置き換わります。</p><button class="button" id="accountImport" type="button" '+((cloud&&!syncReady)||mutationBusy?'disabled':'')+'>このブラウザの設定を引き継ぐ</button></div>'+(notice?'<p class="hw-account-message '+(noticeError?'is-error':'')+'" role="status">'+escape(notice)+'</p>':'')+'<p class="hw-account-hint">ポートフォリオの保有情報は、この端末内だけに保存します。別の端末ではバックアップから復元できます。</p><button class="hw-account-secondary" id="accountLogout" type="button" '+(mutationBusy?'disabled':'')+'>ログアウト</button>';
      byId('accountLogout').addEventListener('click',logout);
      byId('accountImport').addEventListener('click',()=>{
        if(!workspace||!session.user||session.user.id!==user.id||(cloud&&!syncReady))return;
        const prefs=workspace.getGuestPreferences();workspace.applyPreferences(prefs,{notify:false});
        notice=cloud?'ゲストの設定を引き継いでいます。':'ゲストの設定をこのアカウントに引き継ぎました。';noticeError=false;
        if(cloud)queueSave(prefs);else render();
      });
      byId('accountSyncRetry')?.addEventListener('click',()=>{if(syncReady&&needsExplicitSave&&workspace){needsExplicitSave=false;queueSave(workspace.getPreferences());}else loadSession(true);});
      return;
    }
    if(formState==='sent'){
      content.innerHTML='<div class="hw-account-message"><strong>メールをご確認ください。</strong><br>'+escape(readEmail())+'<br>'+(signup?'新規登録が可能なメールアドレスに、登録用リンクを送信します。':'登録済みのメールアドレスに、ログイン用リンクを送信します。')+'</div><p class="hw-account-lead">届いたリンクを開き、メールアドレスを確認して「'+(signup?'登録を完了':'ログインを完了')+'」を押してください。</p><p class="hw-account-hint">メールが見当たらない場合は迷惑メールフォルダをご確認ください。'+(signup?'すでに登録済みの方は「ログイン」からお進みください。':'まだ登録していない方は「新規登録」からお進みください。')+'メールのリンクは、サイトを使うブラウザで開いてください。</p><button class="hw-account-secondary" id="accountChangeEmail" type="button">メールアドレスを変更・再送信</button><button class="hw-account-secondary hw-account-switch" id="accountSwitch" type="button">'+(signup?'登録済みの方はログイン':'初めての方は新規登録')+'</button>';
      byId('accountChangeEmail').addEventListener('click',()=>{formState='email';notice='';render();byId('accountEmailFormEmail')?.focus();});
      byId('accountSwitch').addEventListener('click',()=>selectMode(signup?'login':'signup'));return;
    }
    content.innerHTML='<div class="hw-account-modes" role="group" aria-label="登録・ログインの選択"><button type="button" id="accountLoginMode" aria-pressed="'+!signup+'">ログイン</button><button type="button" id="accountSignupMode" aria-pressed="'+signup+'">新規登録</button></div><p class="hw-account-lead">'+(signup?'初めての方はこちら。メールアドレスで、あなた専用のアカウントを作成します。':'おかえりなさい。登録したメールアドレスでログインしてください。')+'</p>'+formMarkup('accountEmailForm',draftEmail,signup?'登録用リンクを送信':'ログイン用リンクを送信')+'<p class="hw-account-hint">パスワードは不要です。メールに届くリンクで'+(signup?'新規登録':'ログイン')+'を完了します。'+(!signup?'<br>同じブラウザなら、有効期限までログイン状態を保ちます。':'<br>登録せずにサイトを利用することもできます。')+'</p><button class="hw-account-secondary" id="accountSwitch" type="button">'+(signup?'登録済みの方はログイン':'初めての方は新規登録')+'</button>'+(notice?'<p class="hw-account-message '+(noticeError?'is-error':'')+'" role="status">'+escape(notice)+'</p>':'');
    byId('accountLoginMode').addEventListener('click',()=>selectMode('login'));
    byId('accountSignupMode').addEventListener('click',()=>selectMode('signup'));
    byId('accountSwitch').addEventListener('click',()=>selectMode(signup?'login':'signup'));
    byId('accountEmailForm').addEventListener('submit',startLogin);
    byId('accountEmailFormEmail').addEventListener('input',event=>{draftEmail=event.target.value;});
  }
  function updateSync(state,message){syncState=state;syncMessage=message;render();}
  function acceptSession(data,{preserveLocal=false}={}){
    const previousId=session.user?.id??null,nextId=data.user?.id??null,changed=previousId!==nextId;
    if(changed){generation++;cancelWrites();syncReady=false;notice='';workspace?.setOwner(nextId);}
    session=data;
    if(!data.user){syncReady=false;syncState='idle';syncMessage='';render();return;}
    if(!data.cloudEnabled){syncReady=false;syncState='device';syncMessage='設定はこの端末に保存されます。';render();return;}
    if(data.preferencesError){syncReady=false;updateSync('error','アカウントの設定を確認できませんでした。このブラウザの設定は保持されています。');return;}
    syncReady=true;
    if(needsExplicitSave){updateSync('error','このブラウザに未同期の変更があります。保存すると、アカウントの設定が置き換わります。');return;}
    if(preserveLocal&&!changed){updateSync(pendingPreferences||saveRunning?'saving':'saved',pendingPreferences||saveRunning?'アカウントに保存しています…':'このブラウザの最新の設定を保持しています。');return;}
    if(data.preferences&&workspace)workspace.applyPreferences(data.preferences,{notify:false});
    updateSync('saved',data.preferences?'アカウントの設定を読み込みました。':'次に変更したボードやお気に入りが保存されます。');
  }
  async function loadSession(force=false){
    if(loading&&!force)return;
    const sequence=++readSequence,expectedGeneration=generation,expectedRevision=preferenceRevision;loading=true;
    try{
      const data=validSession(await api());
      if(sequence!==readSequence||expectedGeneration!==generation)return;
      acceptSession(data,{preserveLocal:expectedRevision!==preferenceRevision});
    }catch(error){
      if(sequence!==readSequence||expectedGeneration!==generation)return;
      if(session.user){syncReady=false;updateSync('error','アカウントの状態を確認できませんでした。現在のブラウザ設定は保持されています。');}
      else{session={configured:true,user:null,cloudEnabled:false};notice=errorText(error);noticeError=true;render();}
    }finally{if(sequence===readSequence)loading=false;}
  }
  async function startLogin(event){
    event.preventDefault();if(mutationBusy)return;
    const form=event.currentTarget;if(!form.reportValidity())return;
    const email=emailValue(byId('accountEmailFormEmail')),button=form.querySelector('button'),expectedGeneration=generation;draftEmail=email;
    mutationBusy=true;button.disabled=true;button.textContent='メールを送信しています…';
    try{
      const result=await api({action:'start',mode:authMode,email});
      if(expectedGeneration!==generation)return;
      if(result.sent!==true)throw Object.assign(new Error('Email not sent'),{status:503});
      rememberEmail(email);formState='sent';notice='';noticeError=false;
    }catch(error){if(expectedGeneration===generation){rememberEmail(email);notice=errorText(error);noticeError=true;}}
    finally{mutationBusy=false;render();}
  }
  function queueSave(preferences){
    if(!session.user)return;
    preferenceRevision++;
    if(!session.cloudEnabled){updateSync('device','このブラウザに保存しました。');return;}
    if(!syncReady){needsExplicitSave=true;updateSync('error','このブラウザに保存しました。アカウントの設定を確認できるまで、同期は待機します。');return;}
    pendingPreferences=preferences;syncState='saving';syncMessage='アカウントに保存しています…';render();
    clearTimeout(saveTimer);const expectedGeneration=generation,owner=session.user.id;
    saveTimer=setTimeout(()=>flushSave(expectedGeneration,owner),650);
  }
  async function flushSave(expectedGeneration,owner){
    if(saveRunning||!pendingPreferences||generation!==expectedGeneration||session.user?.id!==owner||!syncReady)return;
    const preferences=pendingPreferences;pendingPreferences=null;saveRunning=true;
    try{
      const result=await api({action:'save',owner,preferences});
      if(generation!==expectedGeneration||session.user?.id!==owner)return;
      if(result.saved!==true)throw new Error('Preferences not saved');
      if(!pendingPreferences){notice='';needsExplicitSave=false;updateSync('saved','アカウントに保存しました。');}
    }catch(error){
      if(generation!==expectedGeneration||session.user?.id!==owner)return;
      clearTimeout(saveTimer);pendingPreferences=null;needsExplicitSave=true;
      updateSync('error','同期できませんでした。このブラウザの変更は保持されています。');
      if(error.status===401||error.status===409){syncReady=false;loadSession(true);}
    }finally{
      if(generation===expectedGeneration&&session.user?.id===owner){saveRunning=false;if(pendingPreferences)flushSave(expectedGeneration,owner);}
    }
  }
  async function logout(){
    if(mutationBusy)return;
    mutationBusy=true;generation++;readSequence++;loading=false;cancelWrites();syncReady=false;render();
    try{
      await api({action:'logout'});workspace?.setOwner(null);session={configured:true,user:null,cloudEnabled:false};formState='email';draftEmail='';notice='ログアウトしました。ゲストのボードに戻りました。';noticeError=false;forgetEmail();
    }catch(error){notice=errorText(error);noticeError=true;await loadSession(true);}
    finally{mutationBusy=false;render();}
  }
  window.addEventListener('hw:preferences-changed',event=>{if(session.user&&event.detail?.owner===session.user.id&&event.detail.preferences)queueSave(event.detail.preferences);});
  function selectMode(mode){if(mutationBusy)return;authMode=mode;formState='email';notice='';noticeError=false;render();}
  function openAccount(mode){if(mode)selectMode(mode);if(!dialog.open)dialog.showModal();if(session.configured===null)loadSession();}
  accountButton.addEventListener('click',()=>openAccount('login'));
  signupButton?.addEventListener('click',()=>openAccount('signup'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!mutationBusy&&!saveRunning&&!pendingPreferences)loadSession();});
  window.addEventListener('hashchange',()=>{if(location.hash==='#account'||location.hash==='#signup')openAccount(location.hash==='#signup'?'signup':'login');});
  render();loadSession();if(location.hash==='#account'||location.hash==='#signup')openAccount();
})();
