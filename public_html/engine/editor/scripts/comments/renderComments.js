import {comment} from "../../../../scripts/globalComponents";

export function renderComments (div: JQuery) {

	div.html(`
		<p>
			Only editors for this project can see this. 
			<a href="https://entropyengine.dev/play?p=${projectID}">Public Comments</a>
		</p>
		
		<p style="margin: 10px 0 50px 100px; font-size: 20px">
			<span id="num-comments"></span> Private Comments
		</p>
		
		<div id="add-comment-container">
			<label>
				<input
					type="text"
					id="add-comment"
					placeholder="Add a private comment..."
					maxlength = "500"
				/>
			</label>
		</div>
		<div id="the-comments"></div>
		<footer style="height: 100px"></footer>
	`);

	async function refreshComments (username: string) {
		const comments = await window.request('get-comments', {
			public: false
		})
		$('#num-comments').html(comments.length);

		if (!comments) {
			return;
		}

		const commentsDIV = $('#the-comments');

		commentsDIV.html('');

		for (let commentTxt of comments) {
			let html = comment(commentTxt, commentTxt.username === username);
			commentsDIV.append(html);

			// have to do this here
			if (commentTxt.username !== username) {
				continue;
			}

			$(`#delete-comment-${commentTxt._id}`).click(async () => {

				$(`#comment-${commentTxt._id}-menu`).hide();
				$(`#comment-${commentTxt._id}`).hide();

				await window.request('delete-comment', {
					commentID: commentTxt._id
				})
				await refreshComments(username);
			});
		}
	}

	const addMessage = $("#add-comment");

	window.request('get-username')
		.then(async username => {
			addMessage.keyup(async event => {
				if (event.keyCode !== 13) return;

				const content = addMessage.val();
				addMessage.val('');

				await window.request('comment', {
					content,
					public: false,
				})
				await refreshComments(username.username);
			});

			await refreshComments(username.username);
		});
}