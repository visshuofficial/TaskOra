// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyDelPljQwj6fikfF7Xo54LD_haOd9Kzdk0",
    authDomain: "visshu-skillora.firebaseapp.com",
    databaseURL: "https://visshu-skillora-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "visshu-skillora",
    storageBucket: "visshu-skillora.firebasestorage.app",
    messagingSenderId: "468612780098",
    appId: "1:468612780098:web:7ab20c29f1ecbaa1ea9ddb",
    measurementId: "G-7F0W541S7V"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUserUid = null;
let userData = null;

// --- 2. AUTH STATE LISTENER & INIT ---
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.classList.add('hidden'), 500);
    }, 2000);
};

auth.onAuthStateChanged((user) => {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    
    if (user) {
        currentUserUid = user.uid;
        authContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        loadUserData();
        loadAppSettings();
        switchPage('tasks', document.querySelector('.nav-item')); // Default page
    } else {
        currentUserUid = null;
        mainApp.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});

// --- 3. LOGIN & SIGNUP LOGIC ---
function toggleForm(type) {
    document.getElementById('login-box').classList.toggle('hidden', type === 'signup');
    document.getElementById('signup-box').classList.toggle('hidden', type === 'login');
}

document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;

    auth.createUserWithEmailAndPassword(email, pass).then((cred) => {
        db.ref('users/' + cred.user.uid).set({
            fullName: name, phoneNumber: phone, email: email, balance: 0
        });
    }).catch(err => alert("Error: " + err.message));
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert("Error: " + err.message));
});

function logoutApp() {
    auth.signOut();
}

// --- 4. NAVIGATION & USER DATA ---
function switchPage(pageId, navElement) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navElement.classList.add('active');
    
    if(pageId === 'all') loadTasksList();
    if(pageId === 'payout') loadWithdrawHistory();
    if(pageId === 'refer') loadReferrals();
}

function loadUserData() {
    db.ref('users/' + currentUserUid).on('value', (snap) => {
        if(!snap.exists()) return;
        userData = snap.val();
        
        // Update Balances
        document.getElementById('header-bal-text').innerText = userData.balance.toFixed(2);
        document.getElementById('main-balance-text').innerText = userData.balance.toFixed(2);
        document.getElementById('payout-balance-text').innerText = userData.balance.toFixed(2);
        
        // Profile Info
        document.getElementById('profile-name').value = userData.fullName || '';
        document.getElementById('profile-email').innerText = userData.email || '';
        document.getElementById('profile-phone').innerText = userData.phoneNumber || '';

        // Refer logic init
        if(userData.referCode) {
            document.getElementById('create-refer-div').classList.add('hidden');
            document.getElementById('show-refer-div').classList.remove('hidden');
            document.getElementById('my-active-code').innerText = userData.referCode;
        }
        if(userData.referredBy) {
            document.getElementById('enter-refer-section').classList.add('hidden');
            document.getElementById('applied-refer-section').classList.remove('hidden');
        }
    });
}

function loadAppSettings() {
    db.ref('adminSettings/taskPasswords/instagram').on('value', (snap) => {
        let pass = snap.val() || "pungg#18";
        document.getElementById('admin-req-password').innerText = pass;
    });
}

// --- 5. TASK LOGIC (INSTAGRAM & GMAIL) ---
function openTaskModal() {
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-ig-username').value = '';
    document.getElementById('task-2fa').value = '';
}

function openGmailModal() {
    document.getElementById('gmail-modal').classList.remove('hidden');
    document.getElementById('gmail-user-id').value = '';
    document.getElementById('gmail-user-pass').value = '';
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function copyAdminPassword() {
    let text = document.getElementById('admin-req-password').innerText;
    navigator.clipboard.writeText(text);
    alert("Password Copied!");
}

function copyRecoveryEmail() {
    let text = document.getElementById('recovery-email-text').innerText;
    navigator.clipboard.writeText(text);
    alert("Recovery Email Copied!");
}

function submitTask() {
    let username = document.getElementById('task-ig-username').value.trim();
    let key2fa = document.getElementById('task-2fa').value.trim();

    if(!username || !key2fa) return alert("Please fill all details.");

    let taskId = db.ref().child('tasks/' + currentUserUid).push().key;
    db.ref('tasks/' + currentUserUid + '/' + taskId).set({
        type: 'Instagram',
        username: username,
        key2fa: key2fa,
        status: 'Pending',
        timestamp: Date.now()
    }).then(() => {
        alert("Instagram Task Submitted Successfully!");
        closeModals();
        switchPage('all', document.querySelectorAll('.nav-item')[1]);
    });
}

function submitGmailTask() {
    let gmailId = document.getElementById('gmail-user-id').value.trim();
    let gmailPass = document.getElementById('gmail-user-pass').value.trim();

    if(!gmailId || !gmailPass) return alert("Please fill all details.");

    let taskId = db.ref().child('tasks/' + currentUserUid).push().key;
    db.ref('tasks/' + currentUserUid + '/' + taskId).set({
        type: 'Gmail Creation',
        username: gmailId,
        password: gmailPass,
        status: 'Pending',
        timestamp: Date.now()
    }).then(() => {
        alert("Gmail Task Submitted Successfully!");
        closeModals();
        switchPage('all', document.querySelectorAll('.nav-item')[1]);
    });
}

function loadTasksList() {
    db.ref('tasks/' + currentUserUid).on('value', snap => {
        let list = document.getElementById('task-tracker-list');
        list.innerHTML = '';
        snap.forEach(child => {
            let task = child.val();
            let date = new Date(task.timestamp).toLocaleString();
            list.innerHTML += `
                <div class="list-item status-${task.status}">
                    <div>
                        <div class="item-title">${task.type} - ${task.username}</div>
                        <div class="item-sub">${date}</div>
                    </div>
                    <div class="status-text-${task.status}"><b>${task.status}</b></div>
                </div>`;
        });
        if(list.innerHTML === '') list.innerHTML = '<p class="small-text text-center" style="color:#888;">No tasks submitted yet.</p>';
    });
}

// --- 6. PROMO CODE REDEEM LOGIC ---
function redeemPromoCode() {
    let code = document.getElementById('promo-code-input').value.trim();
    if(!code) return alert("Please enter a promo code.");

    db.ref('promoCodes/' + code).once('value', snap => {
        if(!snap.exists()) return alert("Invalid Promo Code!");
        let promo = snap.val();

        if(Date.now() > promo.expireTime) {
            return alert("This promo code has expired!");
        }

        db.ref(`promoUsage/${code}/${currentUserUid}`).once('value', usageSnap => {
            if(usageSnap.exists()) {
                return alert("You have already used this promo code!");
            }

            db.ref(`promoUsage/${code}`).once('value', allUsesSnap => {
                let currentUses = allUsesSnap.numChildren();
                if(currentUses >= promo.maxUsers) {
                    return alert("Promo code limit reached!");
                }

                db.ref(`users/${currentUserUid}/balance`).transaction(bal => {
                    return (bal || 0) + promo.amount;
                }, (error, committed) => {
                    if(committed) {
                        db.ref(`promoUsage/${code}/${currentUserUid}`).set(true);
                        alert(`Promo code applied successfully! ₹${promo.amount} added to your balance.`);
                        document.getElementById('promo-code-input').value = '';
                    }
                });
            });
        });
    });
}

// --- 7. PAYOUT LOGIC ---
document.getElementById('payout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let amount = parseFloat(document.getElementById('withdraw-amount').value);
    let upi = document.getElementById('withdraw-upi').value.trim();
    let pass = document.getElementById('withdraw-pass').value;

    if(amount < 30) return alert("Minimum withdraw amount is 30₹");
    if(amount > userData.balance) return alert("Insufficient Balance!");

    auth.signInWithEmailAndPassword(userData.email, pass).then(() => {
        db.ref('users/' + currentUserUid + '/balance').set(userData.balance - amount);
        
        let wId = db.ref().child('withdrawals/' + currentUserUid).push().key;
        db.ref('withdrawals/' + currentUserUid + '/' + wId).set({
            amount: amount, upi: upi, status: 'Pending', timestamp: Date.now()
        }).then(() => {
            alert("Withdraw Request Submitted!");
            document.getElementById('payout-form').reset();
        });
    }).catch(err => alert("Incorrect Login Password!"));
});

function loadWithdrawHistory() {
    db.ref('withdrawals/' + currentUserUid).on('value', snap => {
        let list = document.getElementById('withdraw-history-list');
        list.innerHTML = '';
        snap.forEach(child => {
            let w = child.val();
            let date = new Date(w.timestamp).toLocaleString();
            list.innerHTML += `
                <div class="list-item status-${w.status}">
                    <div>
                        <div class="item-title">₹${w.amount} to UPI</div>
                        <div class="item-sub">${date}</div>
                    </div>
                    <div class="status-text-${w.status}"><b>${w.status}</b></div>
                </div>`;
        });
        if(list.innerHTML === '') list.innerHTML = '<p class="small-text text-center" style="color:#888;">No withdrawal history.</p>';
    });
}

// --- 8. REFER LOGIC ---
function createReferCode() {
    let code = document.getElementById('new-refer-code').value.trim();
    let regex = /^[a-zA-Z0-9]{1,8}$/;
    if(!regex.test(code)) return alert("Code must be max 8 alphanumeric characters.");
    
    db.ref('referCodes/' + code).once('value', snap => {
        if(snap.exists()) return alert("This code already exists, choose another.");
        db.ref('referCodes/' + code).set(currentUserUid);
        db.ref('users/' + currentUserUid + '/referCode').set(code);
        alert("Refer Code Created!");
    });
}

function submitFriendCode() {
    let code = document.getElementById('friend-refer-code').value.trim();
    if(code === userData.referCode) return alert("You cannot use your own code!");
    
    db.ref('referCodes/' + code).once('value', snap => {
        if(!snap.exists()) return alert("Invalid Refer Code!");
        let referrerUid = snap.val();
        
        db.ref('users/' + currentUserUid + '/referredBy').set(code);
        db.ref('users/' + referrerUid + '/myReferrals/' + currentUserUid).set({
            name: userData.fullName,
            commission: 0
        });
        alert("Refer Code Applied Successfully!");
    });
}

function loadReferrals() {
    db.ref('users/' + currentUserUid + '/myReferrals').on('value', snap => {
        let list = document.getElementById('referrals-list');
        list.innerHTML = '';
        snap.forEach(child => {
            let refUser = child.val();
            list.innerHTML += `
                <div class="list-item">
                    <div>
                        <div class="item-title"><i class="fa-solid fa-user"></i> ${refUser.name}</div>
                    </div>
                    <div style="color:#00e676"><b>₹${refUser.commission.toFixed(2)}</b> Earned</div>
                </div>`;
        });
        if(list.innerHTML === '') list.innerHTML = '<p class="small-text text-center" style="color:#888;">No referrals yet.</p>';
    });
}

// --- 9. ACCOUNT SETTINGS ---
function updateProfileName() {
    let newName = document.getElementById('profile-name').value.trim();
    if(newName) {
        db.ref('users/' + currentUserUid + '/fullName').set(newName).then(() => alert("Name Updated!"));
    }
}

function openPasswordModal() {
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('pass-current').value = '';
    document.getElementById('pass-new').value = '';
}

function changePassword() {
    let current = document.getElementById('pass-current').value;
    let newPass = document.getElementById('pass-new').value;

    if(newPass.length > 12) return alert("New password max 12 characters!");

    auth.signInWithEmailAndPassword(userData.email, current).then(() => {
        auth.currentUser.updatePassword(newPass).then(() => {
            alert("Password Changed Successfully!");
            closeModals();
        }).catch(err => alert(err.message));
    }).catch(err => alert("Current password incorrect!"));
}
