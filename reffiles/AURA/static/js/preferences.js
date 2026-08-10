function saveProfile() {
    const name = document.getElementById('edit-name').value;
    const role = document.getElementById('edit-role').value;
    const company = document.getElementById('edit-company').value;
    const email = document.getElementById('edit-email').value;
    const religion = document.getElementById('edit-religion').value;
    
    // Add age field handling
    const ageField = document.getElementById('edit-age');
    const age = ageField ? ageField.value : "";

    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>SAVING...</span>';

    const currentThemeStr = localStorage.getItem('aura_theme') || "{}";
    let theme = JSON.parse(currentThemeStr);
    
    let profilePic = localStorage.getItem('aura_profile_pic') || "";
    if (document.getElementById('pic-upload').files.length === 0 && profilePic === "") {
        profilePic = "";
    }

    const data = {
        name: name,
        role: role,
        company: company,
        email: email,
        religion: religion,
        theme: theme,
        profile_pic: profilePic
    };
    
    if (age !== "") {
        data.age = age;
    }

    fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            window.showNotice('AURA', 'Profile Updated Successfully', 3000, true);
        } else {
            window.showNotice('ERROR', res.message, 3000, false, true);
        }
        btn.disabled = false;
        btn.innerHTML = '<span>SAVE PROFILE</span>';
    });
}

function verifyIdentity() {
    const pwd = document.getElementById('fuzzy-password-input').value;
    if (!pwd) return;

    fetch('/api/profile').then(r => r.json()).then(data => {
        if (data.password === pwd) {
            document.getElementById('security-verification-step').style.display = 'none';
            document.getElementById('security-config-section').classList.add('unlocked');
            window.showNotice('ACCESS GRANTED', 'Security Configuration Unlocked', 3000, false);
        } else {
            window.showNotice('ACCESS DENIED', 'Incorrect Password', 3000, false, true);
        }
    });
}

function updateSecurity() {
    const question = document.getElementById('update-security-question').value;
    const answer = document.getElementById('update-security-answer').value;

    if (!question || !answer) {
        window.showNotice('ERROR', 'Both fields are required.', 3000, false, true);
        return;
    }

    fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ security_question: question, security_answer: answer })
    }).then(() => {
        window.showNotice('AURA', 'Security Configuration Updated', 3000, true);
        setTimeout(() => location.reload(), 1500);
    });
}

function changePassword() {
    const newPwd = document.getElementById('new-password-input').value;
    const secAnswer = document.getElementById('security-answer-verify') ? document.getElementById('security-answer-verify').value : null;

    if (!newPwd) {
        window.showNotice('ERROR', 'New password is required.', 3000, false, true);
        return;
    }
    
    if (newPwd.length < 12) {
        window.showNotice('ERROR', 'Password must be at least 12 characters.', 3000, false, true);
        return;
    }
    
    if (!/[A-Z]/.test(newPwd)) {
        window.showNotice('ERROR', 'Password must contain at least 1 capital letter.', 3000, false, true);
        return;
    }

    fetch('/api/profile').then(r => r.json()).then(data => {
        if (data.security_question) {
            if (!secAnswer || secAnswer.toLowerCase().trim() !== data.security_answer.toLowerCase().trim()) {
                window.showNotice('ACCESS DENIED', 'Incorrect Security Answer.', 3000, false, true);
                return;
            }
        }
        
        fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPwd })
        }).then(() => {
            window.showNotice('AURA', 'Credentials Updated Successfully', 3000, true);
            document.getElementById('new-password-input').value = '';
            if (document.getElementById('security-answer-verify')) document.getElementById('security-answer-verify').value = '';
        });
    });
}

function deleteAccount() {
    const pwd = document.getElementById('delete-confirm-password').value;
    if (!pwd) {
        window.showNotice('ERROR', 'Access Key required for deletion.', 3000, false, true);
        return;
    }

    fetch('/api/profile').then(r => r.json()).then(data => {
        fetch('/api/purge_corrupt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: data.name, password: pwd })
        }).then(r => r.json()).then(res => {
            if (res.status === 'success') {
                window.location.href = '/login';
            } else {
                window.showNotice('ERROR', res.message, 3000, false, true);
            }
        });
    });
}

document.getElementById('pic-upload').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            const preview = document.getElementById('profile-preview');
            preview.innerHTML = '';
            preview.style.backgroundImage = `url('${dataUrl}')`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            localStorage.setItem('aura_profile_pic', dataUrl);
            
            // Auto save profile to sync with server immediately
            saveProfile();
        }
        reader.readAsDataURL(e.target.files[0]);
    }
});

function removeProfilePic() {
    const preview = document.getElementById('profile-preview');
    preview.style.backgroundImage = 'none';
    preview.innerHTML = '<i class="fa-solid fa-user"></i>';
    localStorage.removeItem('aura_profile_pic');
    
    // Send empty string to explicitly delete
    fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_pic: "" })
    }).then(() => {
        window.showNotice('AURA', 'Profile Picture Removed', 3000, true);
    });
}

function handleSocialTagClick(e) {
    e.preventDefault();
    window.showNotice('ACCESS DENIED', 'Social Tag cannot be modified after identity creation.', 3000, false, true);
}

const themeData = {
    'official': { primary: '#0078d4', rgb: '0, 120, 212', wallpaper: '/static/wallpapers/official.png' },
    'darkgreen': { primary: '#006400', rgb: '0, 100, 0', wallpaper: '/static/wallpapers/darkgreen.png' },
    'pinkpeach': { primary: '#FFB6C1', rgb: '255, 182, 193', wallpaper: '/static/wallpapers/pinkpeach.png' },
    'bluepurple': { primary: '#8A2BE2', rgb: '138, 43, 226', wallpaper: '/static/wallpapers/bluepurple.png' },
    'pinkpurple': { primary: '#DA70D6', rgb: '218, 112, 214', wallpaper: '/static/wallpapers/pinkpurple.png' },
    'orangeblack': { primary: '#FF4500', rgb: '255, 69, 0', wallpaper: '/static/wallpapers/orangeblack.png' },
    'peachdarkgreen': { primary: '#FFDAB9', rgb: '255, 218, 185', wallpaper: '/static/wallpapers/peachdarkgreen.png' }
};

function selectTheme(themeId) {
    const theme = themeData[themeId];
    if (theme && window.applyTheme) {
        window.applyTheme(theme, theme.wallpaper);
        updateActiveCard(themeId);
    }
}

function updateActiveCard(themeId) {
    document.querySelectorAll('.wallpaper-card').forEach(card => {
        card.classList.remove('active');
        if (card.style.backgroundImage.includes(themeId)) {
            card.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/profile').then(r => r.json()).then(data => {
        if (data.name) document.getElementById('edit-name').value = data.name;
        if (data.role) document.getElementById('edit-role').value = data.role;
        if (data.company) document.getElementById('edit-company').value = data.company;
        if (data.email) document.getElementById('edit-email').value = data.email;
        if (data.religion) document.getElementById('edit-religion').value = data.religion;
        
        const ageField = document.getElementById('edit-age');
        if (ageField && data.age) ageField.value = data.age;

        if (data.profile_pic) {
            const preview = document.getElementById('profile-preview');
            preview.innerHTML = '';
            preview.style.backgroundImage = `url('${data.profile_pic}')`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            localStorage.setItem('aura_profile_pic', data.profile_pic);
        }

        if (data.theme && data.theme.wallpaper) {
            let activeId = 'official';
            for (const [id, t] of Object.entries(themeData)) {
                if (t.wallpaper === data.theme.wallpaper) {
                    activeId = id; break;
                }
            }
            updateActiveCard(activeId);
        }
    });
});