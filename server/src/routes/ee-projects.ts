// import { folderSize } from "../util";
// import route from '../index';
// import fs from "fs";
// import * as path from "path";
// import mv from 'mv';
// import { IncomingForm } from 'formidable';
//
// require('dotenv').config();
//
// if (!process.env.SEC_IDMAX) {
//     throw 'process.env.SEC_IDMAX not defined';
// }
//
// const idMax = parseInt(process.env.SEC_IDMAX);
//
// route('update/projects/access', async ({res, body, query}) => {
//
//     const { projectId, access } = body;
//
//     if (!body.username) {
//         // share project globally
//         await query`UPDATE projects SET globalAccess=${body.accessLevel} WHERE _id=${token?.project}`;
//         res.end("{}");
//         return;
//     }
//
//     if (!token) {
//         res.end(JSON.stringify({error: 'authorisation'}));
//         return;
//     }
//
//     const [auth, _] = await authLevel(token?.user, token?.project);
//     if (auth < 1) {
//         res.end(JSON.stringify({error: 'authorisation'}));
//         return;
//     }
//     const user = await query(`SELECT _id FROM users WHERE username='${clean(body.username)}'`);
//     const userID = user[0]._id;
//
//     const values = await query(`SELECT *
//         FROM projectAccess,users
//         WHERE
//               users._id = projectAccess.userID
//             AND projectAccess.userID = ${clean(userID)}
//             AND projectAccess.projectID = ${clean(token.project)}
//     `);
//
//     if (values.length > 0) {
//         await query(`
//             UPDATE projectAccess
//             SET projectAccess.level=${clean(body.accessLevel)}
//             WHERE projectAccess.projectID = ${clean(token.project)}
//               AND projectAccess.userID = ${clean(userID)}
//         `);
//     } else {
//         await query(`
//             INSERT INTO projectAccess
//             VALUES (${clean(userID)}, ${clean(token.project)}, ${clean(body.accessLevel)})
//     `);
//     }
//
//     res.end(JSON.stringify({error: false}));
// });
//
// export const authLevel = async (userID: number, projectID: number): Promise<[number, string]> => {
//
//     const globalAccess = await query(`SELECT globalAccess from projects WHERE _id=${clean(projectID)}`);
//     const global = globalAccess[0]?.globalAccess || 0;
//
//     const personalAccess = await query(`SELECT level FROM projectAccess WHERE projectID=${clean(projectID)} AND userID=${clean(userID)}`);
//     const personal = personalAccess[0]?.level || 0;
//
//     const adminLevel = await query(`SELECT level FROM users WHERE _id=${clean(userID)}`);
//     const admin = adminLevel[0]?.level || 0;
//
//     let actualLevel = Math.max(personal, global, admin);
//
//     let type = 'personal';
//     if (global >= personal) {
//         type = 'global';
//     }
//     if ((admin > personal && type === 'personal') || (admin > global && type === 'global')) {
//         type = 'admin';
//     }
//
//     return [actualLevel, type]
// };
//
// export const createProject: Handler = async ({res, body, token}) => {
//
//     token ??= {
//         user: 0,
//         project: 0
//     };
//
//     const value = await query(`
//
//         SELECT
//                FLOOR (1 + RAND() * ${clean(idMax)}) AS value
//         FROM
//              projects
//         HAVING
//             value NOT IN (
//                SELECT
//                    DISTINCT _id
//                FROM
//                     projects
//             )
//         LIMIT 1
//
//     `);
//
//     const id = value[0]?.value ||
//         // defaults to random number which is most likely not going to be used yet
//         Math.ceil(Math.random() * idMax);
//
//     token.project = id;
//
//     // got the id, now do the same thing for the salt
//     await query(`
//         INSERT INTO projects VALUES (${clean(id)}, '${clean(body.name)}', 0, 0);
//         INSERT INTO projectSaves VALUES (${clean(token.user)}, ${clean(id)}, CURRENT_TIMESTAMP);
//    `);
//
//     const dir = `../public_html/projects/${id}`;
//
//     fs.mkdirSync(dir);
//
//     try {
//         fs.copyFileSync('../templates/project.settings', dir + '/project.settings');
//         fs.copyFileSync('../templates/scene.scene', dir + '/main.scene');
//
//     } catch (err: any) {
//         console.error(`Creating file in ${dir} failed: ${err}`);
//         return;
//     }
//
//     await query(`
//         INSERT INTO projectAccess VALUES (${clean(token.user)}, ${clean(token.project)}, 3);
//         INSERT INTO projectSaves VALUES (${clean(token.user)}, ${clean(token.project)}, CURRENT_TIMESTAMP);
//     `);
//
//     res.end(JSON.stringify({
//         projectID: id
//     }));
//
// };
//
// /**
//  * Checks if the user is allowed to perform that action,
//  * and if they are then deletes all data associated with the project
//  *
//  * Requires the userAccess.level to be at 2 or more
//  */
// export const deleteProject: Handler = async ({token, res}) => {
//     const value = await query(`SELECT level FROM projectAccess WHERE userID=${clean(token?.user)}`);
//     const userLevel = value[0]?.level || 0;
//     if (userLevel < 2) {
//         res.end(JSON.stringify({
//             ok: false
//         }));
//         return;
//     }
//
//     // delete files
//     const dir = `../public_html/projects/${token?.project}`;
//     fs.rmdirSync(dir, { recursive: true });
//
//     await query(`
//
//         DELETE FROM projects      WHERE _id=${clean(token?.project)};
//         DELETE FROM projectAccess WHERE projectID=${clean(token?.project)};
//         DELETE FROM comments      WHERE projectID=${clean(token?.project)};
//         DELETE FROM projectSaves  WHERE projectID=${clean(token?.project)};
//         DELETE FROM projectViews  WHERE projectID=${clean(token?.project)};
//         DELETE FROM reports       WHERE issueID=${clean(token?.project)} AND type="project";
//
//     `);
//
//     res.end(JSON.stringify({
//         ok: true
//     }));
// };
//
// export const publicProjectsFromUser: Handler = async ({res, body}) => {
//     const values = await query(`
//         SELECT
//             projects.name,
//             projects._id,
//             UNIX_TIMESTAMP(MAX(projectSaves.date)) as latest
//
//         FROM
//             projects,
//             projectAccess,
//             projectSaves,
//             users
//
//         WHERE
//                 projectAccess.projectID = projects._id
//             AND
//                 projectSaves.projectID = projects._id
//             AND
//                 projectSaves.projectID = projectAccess.projectID
//             AND
//                 (projectAccess.level > 0 OR projects.globalAccess > 0)
//             AND
//                 users.username = '${clean(body.username)}'
//
//         GROUP BY
//             projects.name,
//             projects._id,
//             projectAccess.level
//
//         ORDER BY
//              latest DESC
//
//     `);
//     res.end(JSON.stringify(values));
// };
//
// export const getUserProjectNames: Handler = async ({token, res}) => {
//     const values = await query(`
//         SELECT
//             projects.name,
//             projects._id,
//             projectAccess.level,
//             UNIX_TIMESTAMP(MAX(projectSaves.date)) as latest
//
//         FROM
//             projects,
//             projectAccess,
//             projectSaves
//
//         WHERE
//             projectAccess.projectID = projects._id
//           AND
//             projectSaves.projectID = projects._id
//           AND
//             projectSaves.projectID = projectAccess.projectID
//           AND
//             projectAccess.userID = ${clean(token?.user)}
//           AND
//             projectAccess.level > 0
//
//
//         GROUP BY
//              projects.name,
//              projects._id,
//              projectAccess.level
//
//         ORDER BY
//              latest DESC
//
//     `);
//     res.end(JSON.stringify(values));
// };
//
// export const getProjectEditors: Handler = async ({token, res}) => {
//     const values = await query(`
//         SELECT users.username
//         FROM projectAccess, users
//         WHERE
//             projectAccess.userID=users._id AND
//             projectAccess.projectID=${clean(token?.project)}
//     `);
//     res.end(JSON.stringify(values));
// };
//
// export const save: Handler = async ({token, res, body}) => {
//     const dir = `../public_html/projects/${token?.project}/`;
//     if (!token) {
//         res.end(JSON.stringify({"success": false, error: 'auth'}));
//         return;
//     }
//     const [auth, _] = await authLevel(token.user, token.project);
//     if (auth < 1) {
//         res.end(JSON.stringify({"success": false, error: 'auth'}));
//         return;
//     }
//
//     function saveAt (dir: string, json: any) {
//         for (let path in json) {
//             if (typeof body[path] === 'string') {
//                 fs.writeFileSync(dir + path, json[path]);
//             } else if (typeof body[path] === 'object') {
//                 saveAt(dir + json[path], json[path]);
//             }
//         }
//     }
//
//     saveAt(dir, body);
//
//     await query(`INSERT INTO projectSaves VALUES(${clean(token?.user)}, ${clean(token?.project)}, CURRENT_TIMESTAMP)`);
//     res.end(`{"success": "true"}`);
// };
//
// export const accessLevel: Handler = async ({token, res}) => {
//     if (!token) {
//         res.end(JSON.stringify({
//             error: 'authorisation'
//         }));
//         return;
//     }
//
//     const [accessLevel, type] = await authLevel(token?.user, token?.project);
//     res.end(JSON.stringify({
//         type, accessLevel
//     }));
// };
//
// export const getName: Handler = async ({res, token}) => {
//     const value = await query(`SELECT name FROM projects WHERE _id=${clean(token?.project)}`);
//     if (value.length !== 1) {
//         return
//     }
//     res.end(JSON.stringify({
//         name: value[0].name
//     }));
// };
//
// const buildHTML = (htmlTitle: string, projectID: string): string => {
//     let raw = fs.readFileSync('../templates/buildHTML.html').toString();
//     raw = raw.toString();
//     raw = raw.replace(/ID/, projectID);
//     raw = raw.replace(/TITLE/, htmlTitle);
//     return raw;
// };
//
// export const build: Handler = async ({token, res}) => {
//     // TODO: needs logic
//
//     /*
//     await query(`
//
//         UPDATE projects
//         SET projects.hasBuild = 1
//         WHERE projects._id = ${clean(token?.project)}
//
//     `);
//
//      */
//     res.end("{}");
// };
//
//
// export const getAssets: Handler = async ({token, res}) => {
//     const dir = `../public_html/projects/${clean(token?.project)}`;
//     const files = {};
//
//     function readDir (dir: string, obj: any) {
//
//         for (const fileName of fs.readdirSync(dir)) {
//             let fPath = path.join(dir, fileName);
//             if (fs.lstatSync(fPath).isDirectory()) {
//                 obj[fPath] = {};
//                 readDir(fPath, obj[fPath]);
//             } else {
//                 obj[fPath] = fs.readFileSync(fPath).toString();
//             }
//         }
//     }
//
//     readDir(dir, files);
//
//     res.end(JSON.stringify(files));
// };
//
// export const deleteAsset: Handler = async ({token, res, body}) => {
//     const path = `../public_html/projects/${clean(token?.project)}/${body.path}`;
//     fs.unlinkSync(path);
//     res.end("{}");
// };
//
// export const contributorInfo: Handler = async ({token, res}) => {
//     if (!token) {
//         res.end(JSON.stringify({
//             error: 'authorisation'
//         }));
//         return;
//     }
//     // get a table with columns:
//     //  username - username
//     //  count - number of saves
//     //  latest - most recent save
//     const [auth, _] = await authLevel(token.user, token.project);
//     if (auth < 1) {
//         res.end(JSON.stringify([]));
//         return;
//     }
//
//     const values = await query(`
//
//         SELECT
//                t1.username as username,
//                t1.count as count,
//                UNIX_TIMESTAMP(MAX(projectSaves.date)) as latest
//         from
//              (
//                 SELECT
//                      users.username,
//                      users._id,
//                      count(*) as count
//                  from
//                       projectSaves,
//                       users
//                  WHERE
//                        users._id = projectSaves.userID
//                    AND projectSaves.projectID = ${clean(token?.project)}
//                  group by
//                       projectSaves.userId,
//                       users.username
//              ) as t1,
//              projectSaves
//         where
//               t1._id = projectSaves.userID
//         group by
//              t1.username,
//              t1.count
//         order by count desc
//
//     `);
//     res.end(JSON.stringify(values));
// };
//
// export const latestContributor: Handler = async ({token, res}) => {
//     const value = await query(`
//         SELECT
//             users.username,
//             UNIX_TIMESTAMP(projectSaves.date) as date
//         FROM
//             users,
//             projectSaves
//         WHERE
//               users._id = projectSaves.userID
//           AND projectSaves.projectID = ${clean(token?.project)}
//         ORDER BY
//                  projectSaves.date
//                  DESC
//         LIMIT 1
//     `);
//     res.end(JSON.stringify(value));
// };
//
// export const allContributors: Handler = async ({url, res, body}) => {
//     const data = await query(`
//
//     SELECT
//            users.username,
//            UNIX_TIMESTAMP(projectSaves.date) as date
//     FROM
//          users,
//          projectSaves
//     WHERE
//         users._id=projectSaves.userID
//     AND projectID=${clean(body?.projectID || url[1])}
//
//     `);
//     res.end(JSON.stringify(data));
// };
//
// export const projectOwner: Handler = async ({token, res}) => {
//     const data = await query(`
//
//     SELECT
//         users.username
//     FROM
//         users, projectAccess, projects
//     WHERE
//           users._id=projectAccess.userID
//         AND projectAccess.projectID=projects._id
//         AND projects._id=${clean(token?.project)}
//         AND projectAccess.level>=3
//
//     LIMIT 1
//
//     `);
//
//     const total = await query(`
//
//         SELECT COUNT(distinct userID) as count
//         FROM projectSaves
//         WHERE projectID=${clean(token?.project)}
//
//     `);
//
//     res.end(JSON.stringify({
//         owner: data[0]?.username,
//         totalContributors: total[0].count
//     }));
// };
//
// export const viewed: Handler = async ({token, res}) => {
//     await query(`
//
//         INSERT INTO projectViews
//         VALUES (${clean(token?.user)}, ${clean(token?.project)}, CURRENT_TIMESTAMP)
//
//     `);
//     res.end("{}");
// };
//
// export const projectViews: Handler = async ({token, res}) => {
//     const unique = await query(`
//         SELECT COUNT(distinct userID) as count
//         FROM projectViews
//         WHERE projectID=${ clean(token?.project) }
//     `);
//
//     const total = await query(`
//         SELECT COUNT(*) as count
//         FROM projectViews
//         WHERE projectID=${ clean(token?.project) }
//     `);
//
//     res.end(JSON.stringify({
//         unique: unique[0].count,
//         total: total[0].count
//     }));
// };
//
// export const topProjectViews: Handler = async ({res}) => {
//     // no input required - same for all users, doesn't need to be signed in
//     const data = await query(`
//
//         SELECT projects._id as id,
//                COUNT(distinct projectViews.userID) as views
//         FROM projectViews,
//              projects
//         WHERE projectViews.projectID = projects._id
//             AND projects.globalAccess > 0
//             AND projects.hasBuild
//         GROUP BY
//             id
//         ORDER BY
//             views DESC
//
//     `);
//     res.end(JSON.stringify(data));
// };
//
// export const uploadFile: Handler = async ({url, req, res}) => {
//
//     url.shift();
//
//     const projectID = url.shift();
//     const from = url.shift();
//     const path = url.join('/') || '';
//
//     const assetsPath = `../public_html/projects/${clean(projectID)}`;
//
//     folderSize(assetsPath, ({gb, mb}) => {
//         if (gb > 1) {
//             res.end(`
//
//                 <p style="text-align: center; font-size: xx-large">
//                     Looks like you've ran out of space! You have used ${mb} / 1.0 GB!
//                 </p>
//
//                 <a href="https://entropyengine.dev/editor?p=${projectID}&from=${from}">
//                     back
//                 </a>
//
//             `);
//             return;
//         }
//
//         const form = new IncomingForm();
//
//         form.parse(req, (err, fields, files) => {
//
//             let file = files.filetoupload;
//             if (Array.isArray(file)) {
//                 file = file[0];
//             }
//
//             const oldPath = file.filepath;
//             const newPath = `${assetsPath}/${path}/${file.filepath}`;
//
//             mv(oldPath, newPath, err => {
//                 if (err) {
//                     res.end(err.toString());
//                 } else {
//                     res.end(`
//                         <html lang="eng">
//                         <head>
//                             <title>uploading...</title>
//                             <meta http-equiv="refresh" content="0;URL='https://entropyengine.dev/editor?p=${clean(projectID)}&from=${from}'"/>
//                         </head>
//                         <body>
//                             <div style="display: flex; align-items: center; justify-content: center; height: 100%">
//                                 <p style="text-align: center; font-size: xx-large">
//                                     File uploaded! Returning to project...
//                                 </p>
//                             </div>
//                         </body>
//                         </html>
//                     `);
//                 }
//             });
//         });
//     });
// };
//
// export const findScripts: Handler = async ({ token, res }) => {
//
//     if (!token) {
//         res.end(JSON.stringify({
//             error: 'authorisation'
//         }))
//         return;
//     }
//
//     function fromDir (startPath: string, filter: string): string[] {
//
//         let paths: string[] = [];
//
//         if (!fs.existsSync(startPath)){
//             return [];
//         }
//
//         let files = fs.readdirSync(startPath);
//         for (let i = 0; i < files.length; i++){
//             let filename = path.join(startPath, files[i]);
//             if (fs.lstatSync(filename).isDirectory()) {
//                 paths = [...paths, ...fromDir(filename, filter)]; // recurse
//             } else if (filename.indexOf(filter) >= 0) {
//                 paths = [...paths, filename];
//             }
//         }
//         return paths;
//     }
//
//     const [auth, _] = await authLevel(token.user, token.project);
//     if (auth < 1) {
//         console.error(`Attempt to access files in project ${clean(token?.project)} without authorisation. Token:`, token);
//         res.end(JSON.stringify([]));
//         return;
//     }
//
//     let paths = fromDir(`../public_html/projects/${clean(token?.project)}`,'.es');
//     paths = paths.map(p => '../' + p.substring('../public_html/'.length));
//     res.end(JSON.stringify(paths));
// };