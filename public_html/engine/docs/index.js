$('#userID').html(localStorage.id || '<your-user-id>');

if (!localStorage.id) {
    $('sign-in-info').html(`
        Looks like you aren't signed in!
        <div style="text-align: center; font-size: 30px; margin-top: 20px">
            <a href="../accounts/sign-in">Sign In</a>
            <a href="../accounts/new">Create Account</a>
        </div>
    `);
}