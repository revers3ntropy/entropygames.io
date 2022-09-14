import * as core from './main.js';
import FullPagePopup from './components/FullPagePopup.js';
import EventCard from './components/EventCard.js';
import UserCard from './components/UserCard.js';
import { getComponentId } from "./componentIdx.js";

/**
 * Shows a popup with the event detail from the given event id.
 * @param {string} eventId
 * @param reload
 * @returns {Promise<void>}
 */
export async function eventPopup(eventId, reload = () => {}) {
    const events = await core.api(`get/events`, { eventId });
    if (!events?.data?.length) {
        await core.showError('Event not found');
        return;
    }
    const event = events.data[0];
    
    const uid = getComponentId();
    
    window[`_EventCard${uid}__changeName`] = async value => {
        await core.api(`update/events/name`, {
            eventId: event.id,
            name: value,
        });
        reload();
    };
    
    FullPagePopup(
        document.body,
        core.inlineComponent(
            EventCard,
            async () => {
                const events = await core.api(`get/events`, { eventId, });
                return events?.['data']?.[0];
            },
            false
        ),
        `
            ${await core.isAdmin() ? `
                <input
                    value="${core.escapeHTML(event.name)}"
                    onchange="_EventCard${uid}__changeName(this.value)"
                    class="editable-text event-title-editable"
                >
            ` : core.escapeHTML(event.name)}
        `
    );
}

/**
 * Shows a popup with the user detail from the given event id.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function userPopupFromId(userId) {
    const user = await core.api(`get/users`, { userId });
    if (!user) {
        await core.showError('User not found');
        return;
    }
    FullPagePopup(
        document.body,
        core.inlineComponent(
            UserCard,
            async () => {
                return await core.api(`get/users`, { userId });
            },
            false
        ),
        `
            ${await core.isAdmin() ? `
				<button
                    class="icon medium"
                    svg="account.svg"
                    onclick="signInAs('${user.id}', '${user.email}')"
                    data-label="Sign in as"
                ></button>
            ` : ''}
            <a href="${core.ROOT_PATH}/user/?email=${user.email}">
                ${core.escapeHTML(user.email)}
            </a>
        `
    );
}

/**
 * Shows a popup with the event detail from the given event id.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function userPopup(email) {
    if (typeof email !== 'string' || !email.includes('@')) {
        await core.showError('Invalid email: ' + email);
        return;
    }
    const user = await core.api(`get/users`, { email });
    if (!user) {
        await core.showError('User not found');
        return;
    }
    FullPagePopup(
        document.body,
        core.inlineComponent(
            UserCard,
            async () => {
                return await core.api(`get/users`, { email });
            },
            false
        ),
        `
            ${await core.isAdmin() ? `
				<button
                    class="icon medium"
                    svg="account.svg"
                    onclick="signInAs('${user.id}', '${email}')"
                    data-label="Sign in as"
                ></button>
            ` : ''}
            <a href="${core.ROOT_PATH}/user/?email=${user.email}">
                ${core.escapeHTML(email)}
            </a>
        `
    );
}
