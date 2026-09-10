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

// --- 2. PREMIUM TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'info') icon = 'fa-circle-info';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- 3. RECONNECTION & VISIBILITY LISTENER ---
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentUserUid) {
        showToast("Reconnecting...", "info");
        db.ref('.info/connected').once('value').then(() => {
            showToast("Reconnected successfully!", "success");
        }).catch(() => {
            showToast("Connection unstable", "error");
        });
    }
});

// --- 4. AUTH STATE LISTENER & INIT ---
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
        switchPage('tasks', document.querySelector('.nav-item'));
    } else {
        currentUserUid = null;
        mainApp.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});

// --- 5. LOGIN & SIGNUP LOGIC ---
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
            fullName: name, phoneNumber: phone, email: email, balance: 0, disabled: false
        });
        showToast("Account created successfully!", "success");
    }).catch(err => showToast(err.message, "error"));
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, pass).then(() => {
        showToast("Login successful!", "success");
    }).catch(err => {
        let msg = err.message;
        if(err.code === 'auth/user-disabled') msg = "Your account disabled by admin";
        showToast(msg, "error");
    });
});

function logoutApp() {
    auth.signOut();
    showToast("Logged out successfully", "info");
}

// --- 6. NAVIGATION & USER DATA ---
function switchPage(pageId, navElement) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    const targetPage = document.getElementById('page-' + pageId);
    if(targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navElement) navElement.classList.add('active');
    
    if(pageId === 'all') loadTasksList();
    if(pageId === 'payout') loadWithdrawHistory();
    if(pageId === 'refer') loadReferrals();
}

function loadUserData() {
    db.ref('users/' + currentUserUid).on('value', (snap) => {
        if(!snap.exists()) return;
        userData = snap.val();
        
        if(userData.disabled) {
            auth.signOut();
            showToast("Your account has been disabled by admin.", "error");
            return;
        }

        if(userData.directNotice) {
            document.getElementById('notice-modal-text').innerText = userData.directNotice;
            document.getElementById('notice-modal').classList.remove('hidden');
        }
        
        document.getElementById('header-bal-text').innerText = (userData.balance || 0).toFixed(2);
        document.getElementById('main-balance-text').innerText = (userData.balance || 0).toFixed(2);
        document.getElementById('payout-balance-text').innerText = (userData.balance || 0).toFixed(2);
        
        document.getElementById('profile-name').value = userData.fullName || '';
        document.getElementById('profile-email').innerText = userData.email || '';
        document.getElementById('profile-phone').innerText = userData.phoneNumber || '';

        if(userData.referCode) {
            document.getElementById('create-refer-div').classList.add('hidden');
            document.getElementById('show-refer-div').classList.remove('hidden');
            document.getElementById('my-active-code').innerText = userData.referCode;
        }
        if(userData.referredBy) {
            document.getElementById('enter-refer-section').classList.add('hidden');
            document.getElementById('applied-refer-section').classList.remove('hidden');
        }

        db.ref('tasks/' + currentUserUid).once('value', taskSnap => {
            taskSnap.forEach(child => {
                checkAndProcessReferralCommission(child.key, child.val());
            });
        });
    });
}

function closeNoticeModal() {
    document.getElementById('notice-modal').classList.add('hidden');
    db.ref('users/' + currentUserUid + '/directNotice').remove();
}

let instagramTutorialUrl = "";

function loadAppSettings() {
    db.ref('adminSettings/taskPasswords/instagram').on('value', (snap) => {
        let pass = snap.val() || "pungg#18";
        document.getElementById('admin-req-password').innerText = pass;
    });

    db.ref('adminSettings/instagramTutorial').on('value', (snap) => {
        instagramTutorialUrl = snap.val() || "";
    });

    db.ref('adminSettings/recoveryEmail').on('value', (snap) => {
        let email = snap.val() || "fucx0976@gmail.com";
        document.getElementById('recovery-email-text').innerText = email;
    });

    db.ref('adminSettings/maintenance').on('value', (snap) => {
        let maint = snap.val() || { enabled: false, notice: "" };
        let maintOverlay = document.getElementById('maintenance-overlay');
        if (maint.enabled) {
            document.getElementById('maintenance-notice-text').innerText = maint.notice || "The application is currently under maintenance. Please check back later.";
            maintOverlay.classList.remove('hidden');
        } else {
            maintOverlay.classList.add('hidden');
        }
    });
}

// --- 7. TASK LOGIC ---
function openTaskModal() {
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-ig-username').value = '';
    document.getElementById('task-2fa-key').value = '';
}

function openGmailModal() {
    document.getElementById('gmail-modal').classList.remove('hidden');
    document.getElementById('gmail-user-id').value = '';
    document.getElementById('gmail-user-pass').value = '';
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        if(m.id !== 'maintenance-overlay') {
            m.classList.add('hidden');
        }
    });
}

function copyAdminPassword() {
    let text = document.getElementById('admin-req-password').innerText;
    navigator.clipboard.writeText(text);
    showToast("Password Copied!", "success");
}

function copyRecoveryEmail() {
    let text = document.getElementById('recovery-email-text').innerText;
    navigator.clipboard.writeText(text);
    showToast("Recovery Email Copied!", "success");
}

function submitTask() {
    let username = document.getElementById('task-ig-username').value.trim();
    let key2fa = document.getElementById('task-2fa-key').value.trim();
    
    if(!username || !key2fa) return showToast("Please fill all details including 2FA key.", "error");

    let taskId = db.ref().child('tasks/' + currentUserUid).push().key;
    db.ref('tasks/' + currentUserUid + '/' + taskId).set({
        type: 'Instagram',
        username: username,
        key2fa: key2fa,
        amount: 1,
        status: 'Pending',
        timestamp: Date.now()
    }).then(() => {
        showToast("Instagram Task Submitted Successfully!", "success");
        closeModals();
        switchPage('all', document.querySelectorAll('.nav-item')[1]);
    });
}

function submitGmailTask() {
    let gmailId = document.getElementById('gmail-user-id').value.trim();
    let gmailPass = document.getElementById('gmail-user-pass').value.trim();

    if(!gmailId || !gmailPass) return showToast("Please fill all details.", "error");

    let taskId = db.ref().child('tasks/' + currentUserUid).push().key;
    db.ref('tasks/' + currentUserUid + '/' + taskId).set({
        type: 'Gmail Creation',
        username: gmailId,
        password: gmailPass,
        amount: 6,
        status: 'Pending',
        timestamp: Date.now()
    }).then(() => {
        showToast("Gmail Task Submitted Successfully!", "success");
        closeModals();
        switchPage('all', document.querySelectorAll('.nav-item')[1]);
    });
}

function checkAndProcessReferralCommission(taskId, task) {
    let isApproved = task.status === 'Approved' || task.status === 'Success' || task.status === 'Completed';
    if (isApproved && !task.commissionProcessed) {
        db.ref('tasks/' + currentUserUid + '/' + taskId + '/commissionProcessed').set(true);

        let taskAmount = task.amount || (task.type === 'Gmail Creation' ? 6 : 1);
        let comm = taskAmount * 0.15;

        let processCommission = (referrerUid) => {
            if (!referrerUid) return;
            
            db.ref('users/' + referrerUid + '/balance').transaction((bal) => {
                return (bal || 0) + comm;
            });

            db.ref('users/' + referrerUid + '/myReferrals/' + currentUserUid + '/commission').transaction((c) => {
                return (c || 0) + comm;
            });
        };

        if (userData && userData.referredByUid) {
            processCommission(userData.referredByUid);
        } else if (userData && userData.referredBy) {
            db.ref('referCodes/' + userData.referredBy).once('value', refSnap => {
                if (refSnap.exists()) {
                    let refUid = refSnap.val();
                    db.ref('users/' + currentUserUid + '/referredByUid').set(refUid);
                    processCommission(refUid);
                }
            });
        }
    }
}

function loadTasksList() {
    db.ref('tasks/' + currentUserUid).on('value', snap => {
        let list = document.getElementById('task-tracker-list');
        list.innerHTML = '';
        snap.forEach(child => {
            let task = child.val();
            let taskId = child.key;
            checkAndProcessReferralCommission(taskId, task);

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

// --- 8. SECURE PROMO CODE REDEEM LOGIC ---
function redeemPromoCode() {
    let code = document.getElementById('promo-code-input').value.trim();
    if(!code) return showToast("Please enter a promo code.", "error");

    let redeemBtn = document.getElementById('redeem-btn');
    redeemBtn.disabled = true;

    db.ref('promoCodes/' + code).once('value', snap => {
        if(!snap.exists()) {
            redeemBtn.disabled = false;
            return showToast("Promo code already used or invalid", "error");
        }
        let promo = snap.val();

        if(Date.now() > promo.expireTime) {
            redeemBtn.disabled = false;
            return showToast("This promo code has expired!", "error");
        }

        db.ref(`promoUsage/${code}/${currentUserUid}`).transaction((currentVal) => {
            if (currentVal !== null) {
                return;
            }
            return true;
        }, (error, committed, snapshot) => {
            if (error || !committed) {
                redeemBtn.disabled = false;
                return showToast("Promo code already used or invalid", "error");
            }

            db.ref(`promoUsage/${code}`).once('value', allUsesSnap => {
                let currentUses = allUsesSnap.numChildren();
                if(currentUses > promo.maxUsers) {
                    db.ref(`promoUsage/${code}/${currentUserUid}`).remove();
                    redeemBtn.disabled = false;
                    return showToast("Promo code limit reached!", "error");
                }

                db.ref(`users/${currentUserUid}/balance`).transaction(bal => {
                    return (bal || 0) + promo.amount;
                }, (err, comm) => {
                    redeemBtn.disabled = false;
                    if(comm) {
                        showToast(`Promo code applied successfully!`, "success");
                        document.getElementById('promo-code-input').value = '';
                    }
                });
            });
        });
    });
}

// --- 9. PAYOUT LOGIC & DETAILS MODAL ---
document.getElementById('payout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let amount = parseFloat(document.getElementById('withdraw-amount').value);
    let upi = document.getElementById('withdraw-upi').value.trim();
    let holder = document.getElementById('withdraw-holder').value.trim();
    let pass = document.getElementById('withdraw-pass').value;

    if(amount < 10) return showToast("Minimum withdraw amount is 10₹", "error");
    if(amount > userData.balance) return showToast("Insufficient Balance!", "error");

    auth.signInWithEmailAndPassword(userData.email, pass).then(() => {
        db.ref('users/' + currentUserUid + '/balance').set(userData.balance - amount);
        
        let wId = db.ref().child('withdrawals/' + currentUserUid).push().key;
        db.ref('withdrawals/' + currentUserUid + '/' + wId).set({
            amount: amount, upi: upi, holderName: holder, status: 'Pending', timestamp: Date.now()
        }).then(() => {
            showToast("Withdrawal requested successfully", "success");
            document.getElementById('payout-form').reset();
        });
    }).catch(err => showToast("Incorrect Login Password!", "error"));
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
                    <div class="history-action-group">
                        <div class="status-text-${w.status}"><b>${w.status}</b></div>
                        <button class="eye-btn" onclick='openWithdrawDetail(${JSON.stringify(w)})'>
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                </div>`;
        });
        if(list.innerHTML === '') list.innerHTML = '<p class="small-text text-center" style="color:#888;">No withdrawal history.</p>';
    });
}

function openWithdrawDetail(w) {
    document.getElementById('withdraw-detail-modal').classList.remove('hidden');
    document.getElementById('modal-w-status').innerText = w.status;
    document.getElementById('modal-w-amount').innerText = '₹' + w.amount;
    document.getElementById('modal-w-holder').innerText = w.holderName || '---';
    document.getElementById('modal-w-upi').innerText = w.upi || '---';

    let noticeDiv = document.getElementById('modal-success-notice');
    let isSuccessful = w.status === 'Approved' || w.status === 'Success' || w.status === 'Completed';
    
    if(isSuccessful) {
        let netAmount = w.amount - 2;
        noticeDiv.classList.remove('hidden');
        noticeDiv.innerText = `Your withdrawal has been successfully credited to your account ₹${w.amount}.`;
    } else {
        noticeDiv.classList.add('hidden');
        noticeDiv.innerText = '';
    }
}

// --- 10. REFER LOGIC ---
function createReferCode() {
    let code = document.getElementById('new-refer-code').value.trim();
    let regex = /^[a-zA-Z0-9]{1,8}$/;
    if(!regex.test(code)) return showToast("Code must be max 8 alphanumeric characters.", "error");
    
    db.ref('referCodes/' + code).once('value', snap => {
        if(snap.exists()) return showToast("This code already exists, choose another.", "error");
        db.ref('referCodes/' + code).set(currentUserUid);
        db.ref('users/' + currentUserUid + '/referCode').set(code);
        showToast("Refer Code Created!", "success");
    });
}

function submitFriendCode() {
    let code = document.getElementById('friend-refer-code').value.trim();
    if(code === userData.referCode) return showToast("You cannot use your own code!", "error");
    
    db.ref('referCodes/' + code).once('value', snap => {
        if(!snap.exists()) return showToast("Invalid Refer Code!", "error");
        let referrerUid = snap.val();
        
        db.ref('users/' + currentUserUid + '/referredBy').set(code);
        db.ref('users/' + currentUserUid + '/referredByUid').set(referrerUid);
        db.ref('users/' + referrerUid + '/myReferrals/' + currentUserUid).set({
            name: userData.fullName,
            commission: 0
        });
        showToast("Refer Code Applied Successfully!", "success");
    });
}

function loadReferrals() {
    db.ref('users/' + currentUserUid + '/myReferrals').on('value', snap => {
        let list = document.getElementById('referrals-list');
        list.innerHTML = '';
        snap.forEach(child => {
            let refUser = child.val();
            let comm = refUser.commission || 0;
            list.innerHTML += `
                <div class="list-item">
                    <div>
                        <div class="item-title"><i class="fa-solid fa-user"></i> ${refUser.name}</div>
                    </div>
                    <div style="color:#00e676"><b>₹${comm.toFixed(2)}</b> Earned</div>
                </div>`;
        });
        if(list.innerHTML === '') list.innerHTML = '<p class="small-text text-center" style="color:#888;">No referrals yet.</p>';
    });
}

// --- 11. ACCOUNT SETTINGS ---
function updateProfileName() {
    let newName = document.getElementById('profile-name').value.trim();
    if(newName) {
        db.ref('users/' + currentUserUid + '/fullName').set(newName).then(() => showToast("Name Updated!", "success"));
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

    if(newPass.length > 12) return showToast("New password max 12 characters!", "error");

    auth.signInWithEmailAndPassword(userData.email, current).then(() => {
        auth.currentUser.updatePassword(newPass).then(() => {
            showToast("Password Changed Successfully!", "success");
            closeModals();
        }).catch(err => showToast(err.message, "error"));
    }).catch(err => showToast("Current password incorrect!", "error"));
}
function openInstagramTutorial() {
    if (instagramTutorialUrl) {
        window.open(instagramTutorialUrl, '_blank');
    } else {
        showToast("Tutorial video link is not available yet.", "info");
    }
}