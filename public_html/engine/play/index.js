import {comment as commentComponent} from '../../scripts/globalComponents';

import * as ee from 'entropy-engine';

window.apiToken.project = parseInt(window.urlParam('p') || '0');

const cacheBust = Math.floor(Math.random() * 10**5);

function notAvailable (data: any) {
    window.location.href = `https://entropyengine.dev/accounts/error?type=buildPlayFail&extra=${JSON.stringify(data)}`;
}

document.addEventListener('keypress', evt => evt.preventDefault());
document.addEventListener('keydown', evt => evt.preventDefault());
document.addEventListener('keyup', evt => evt.preventDefault());

window.request ('has-build')
    .then (async beenBuilt => {
        if (!beenBuilt.built) {
            notAvailable(beenBuilt);
            return;
        }

        const access = await window.request('get-project-access');
        if (access.accessLevel < 1) {
            notAvailable(access);
            return;
        }

        $('#contributors-link').attr('href',  (_, v) => v + window.apiToken.project);

        // run the actual game - use cache-bust to get the most recent version
        await ee.runFromJSON(`../projects/${window.apiToken.project}/build/index.json?cache-bust=${cacheBust}`);

        const owner = await window.request('project-owner');
        if (owner.totalContributors-1 < 1) {
            $('#project-owner').html(owner.owner);
        }
        else {
            $('#project-owner').html(`
                ${owner.owner} and ${owner.totalContributors-1} others
            `);
        }

        window.request('viewed-project', window.apiToken);

        const projectViewsData = await window.request('project-views');
        $('#views').html(`
            <span style="margin-right: 10px">
                ${projectViewsData.unique} viewers
            </span>

            <span>
                ${projectViewsData.total} views
            </span>
        `);

        async function refreshComments (username: string) {
            const comments = await window.request('get-comments', {
                public: true
            });
            $('#num-comments').html(comments.length);

            if (!comments) return;

            const commentsDIV = $('#comments');

            commentsDIV.html('');

            for (let comment of comments) {
                commentsDIV.append(commentComponent(comment, comment.username === username));

                // have to do this here
                if (comment.username !== username) continue;

                $(`#delete-comment-${comment._id}`).click(async () => {

                    $(`#comment-${comment._id}-menu`).hide();
                    $(`#comment-${comment._id}`).hide();

                    await window.request('delete-comment', {
                        commentID: comment._id
                    });
                    refreshComments(username);
                });
            }
        }


        const addMessage = $("#add-comment");

        const username = await window.request('get-username');

        addMessage.keyup(async event => {
            if (event.keyCode !== 13) return;

            const content = addMessage.val();
            addMessage.val('');

            await window.request('comment', {
                content,
                public: true
            });
            refreshComments(username.username);
        });

        refreshComments(username.username);
    });