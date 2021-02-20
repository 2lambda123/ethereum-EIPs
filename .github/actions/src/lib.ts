import { CompareCommits, File, Files, Github, ParsedFile, PR } from "./types";
import fetch from "node-fetch";
import frontmatter from "front-matter";

const FILE_RE = /^EIPS\/eip-(\d+)\.md$/mg;
const AUTHOR_RE = new RegExp("[(<]([^>)]+)[>)]");
const MERGE_MESSAGE = `
Hi, I'm a bot! This change was automatically merged because:
 - It only modifies existing Draft, Review, or Last Call EIP(s)
 - The PR was approved or written by at least one author of each modified EIP
 - The build is passing
`;

let _EIPInfo: { number: string; authors: any }[] = [];
const EIPInfo = (number: string, authors: any) => {
  _EIPInfo.push({ number, authors });
  return { number, authors };
};

let users_by_email = {};

const find_user_by_email = (Github: Github) => (email: string) => {
  if (!users_by_email[email]) {
    const results = Github.search_users(email);
    if (results.length > 0) {
      console.log("Recording mapping from %s to %s", email, results[0].login);
      users_by_email[email] = "@" + results[0].login;
    } else {
      console.log("No github user found for %s", email);
    }
  } else return users_by_email[email];
};

const ALLOWED_STATUSES = new Set(["draft", "last call", "review"]);

// // class MergeHandler(webapp2.RequestHandler):

// const resolve_author = (author: string) => {
//   if (author[0] === "@") {
//     return author.toLowerCase();
//   } else {
//     // Email address
//     return (find_user_by_email(author) || author).toLowerCase();
//   }
// };

const get_authors = (authorlist: string[]) => {
  const authors = authorlist.map((author) => author.match(AUTHOR_RE));
  console.log(authors);
  return new Set(authors);
  // return new Set(authors.map(resolve_author);
};

// const post = (request: any, Github: Github) => {
//   const payload = JSON.parse(request["payload"]);
//   if (request.headers.includes("X-Github-Event")) {

//     const event = request.headers["X-Github-Event"];
//     console.log(`Got Github webhook event ${event}`);
//     if (event == "pull_request_review") {
//       const pr = payload["pull_request"];
//       const prnum = pr["number"];
//       const repo = pr["base"]["repo"]["full_name"];
//       console.log("Processing review on PR ${repo}/${prnum}...");
//       check_pr(repo, prnum);
//     }
//   } else {
//     console.log(`Processing build ${payload["number"]}...`);
//     if (payload["pull_request_number"] === null) {
//       console.log(
//         "Build %s is not a PR build; quitting",
//         payload["number"]
//       );
//       return;
//     }
//     const prnum = payload["pull_request_number"];
//     const repo = `${payload["repository"]["owner_name"]}/${payload["repository"]["name"]}`;
//     check_pr(repo, prnum);
//   }
// };

// const get = (request: any) => {
//   return check_pr(request["repo"], JSON.parse(request["pr"]))
// }

// const get_approvals = (pr: PR) => {
//   let approvals = '@' + pr.data.user.login.toLowerCase()
//   const reviews = pr.get_reviews()

//   reviews.map(review => {
//     if (review.state == "APPROVED") {
//       approvals += '@' + review.user.login.toLowerCase()
//     }
//   })

//   return approvals
// }

// const post_comment = (Github: Github) => async (pr: PR, message: string) => {
//   const me = Github.get_user()
//   const {data: comments} = await Github.issues.listComments();

//   // If comment already exists, edit that
//   for (const comment of comments) {
//     if (comment.user.login == me.login) {
//       console.log("Found comment by self");
//     }

//     if (comment.body != message) {
//       Github.issues.updateComment({
//         owner: comment.user.login,
//         repo: pr.data.base.repo.full_name,
//         comment_id: comment.id,
//         body: message
//       })
//       return;
//     }
//   }

//   // if comment does not exist, create a new one
//   Github.issues.createComment({
//     owner: pr.data.base.repo.owner.login,
//     repo: pr.data.base.repo.full_name,
//     issue_number: pr.data.number,
//     body: message
//   })
// }

const parseFile = async (file: File): Promise<ParsedFile> => {
  const fetchRawFile = (file: File): Promise<any> =>
    fetch(file.contents_url, { method: "get" }).then((res) => res.json());
  const decodeContent = (rawFile: any) =>
    Buffer.from(rawFile.content, "base64").toString();
  const rawFile = await fetchRawFile(file);

  return { path: rawFile.path, name: rawFile.name, content: frontmatter(decodeContent(rawFile)) };
};

const check_file = async ({ data: pr }: PR, file: File) => {
  const parsedFile = await parseFile(file);
  const fileName = parsedFile.path;

  console.log(`---- check_file: ${fileName}`);
  try {
    const match = fileName.search(FILE_RE);
    if (match === -1) {
      return [null, `File ${fileName} is not an EIP`];
    }

    console.log(`eipnum search matches: ${match} trying to match the filename: ${fileName}`);
    const eipnum = match[0];

    if (file.status == "added") {
      return [null, `Contains new file ${fileName}`];
    }

    console.log(
      `Getting file ${fileName} from ${pr.base.user.login}@${pr.base.repo.name}/${pr.base.sha}`
    );

    const basedata = parsedFile.content;
    console.log(basedata.attributes);

    const status = basedata.attributes["status"];
    const author = basedata.attributes["author"];
    if (ALLOWED_STATUSES.has(status.toLowerCase())) {
      return [
        null,
        `EIP ${eipnum} is in state ${status}, not Draft or Last Call`,
      ];
    }
    const eip = EIPInfo(eipnum, get_authors(author));
    console.log(_EIPInfo, eip);
    // if (basedata.attributes["eip"] !== eipnum) {
    //   return [
    //     eip,
    //     `EIP header in ${fileName} does not match: ${basedata.attributes["eip"]}`,
    //   ];
    // }

    // console.log(
    //   `Getting file ${fileName} from ${pr.base.user.login}@${pr.base.repo.name}/${pr.base.sha}`
    // );
    // const head = pr.head.repo.get_contents(file.filename, pr.head.sha); // ref=pr.head.sha
    // const headdata = frontmatter(btoa(head.content));
    // if (headdata.attributes["eip"] != eipnum) {
    //   return [
    //     eip,
    //     `EIP header in modified file ${fileName} does not match: ${headdata.attributes["eip"]}`,
    //   ];
    // } else if (
    //   headdata.attributes["status"].toLowerCase() !=
    //   basedata.attributes["status"].toLowerCase()
    // ) {
    //   return [
    //     eip,
    //     `Trying to change EIP ${eipnum} state from ${basedata.attributes["status"]} to ${headdata.attributes["status"]}`,
    //   ];
    // }

    return [eip, null];
  } catch (e) {
    console.warn("Exception checking file %s", file.filename);
    return [null, `Error checking file ${file.filename}`];
  }
};

export const check_pr = (request: CompareCommits, Github: Github) => async (
  reponame: string,
  prnum: number,
  owner: string
) => {
  console.log(`Checking PR ${prnum} on ${reponame}`);
  const { data: repo } = await Github.repos.get({
    owner,
    repo: reponame,
  });
  console.log(`repo full name: `, repo.full_name);

  const pr = await Github.pulls.get({
    repo: repo.name,
    owner: repo.owner.login,
    pull_number: prnum,
  });
  let response = "";

  if (pr.data.merged) {
    console.log("PR %d is already merged; quitting", prnum);
    return;
  }
  if (pr.data.mergeable_state != "clean") {
    console.log(
      `PR ${prnum} mergeable state is ${pr.data.mergeable_state}; quitting`
    );
    return;
  }

  const files = request.data.files;

  let eips = [];
  let errors = [];
  console.log("---------");
  console.log(`${files.length} file found!` || "no files");

  const contents = await Promise.all(files.map(parseFile));
  contents.map((file) =>
    console.log(`file name ${file.name} has length ${file.content.body.length}`)
  );
  console.log("---------");

  files.map(async (file: File) => {
    try {
      const [eip, error] = await check_file(pr, file);
      if (eip) {
        eips.push(eip);
      }
      if (error) {
        console.log(error);
        errors.push(error);
      }
    } catch (err) {
      console.log(err);
    }
  });

  let reviewers = new Set();
  // const approvals = get_approvals(pr)
  // console.log(`Found approvals for ${prnum}: ${approvals}`)

  eips.map((eip) => {
    const authors: Set<string> = eip.authors;
    const number: string = eip.number;
    console.log(`EIP ${number} has authors: ${authors}`);
    if (authors.size == 0) {
      errors.push(
        `EIP ${number} has no identifiable authors who can approve PRs`
      );
    } // } else if ([...approvals].find(authors.has)){
    //   errors.push(`EIP ${number} requires approval from one of (${authors})`);
    //   [...authors].map(author => {
    //     if (author.startsWith('@')) {
    //       reviewers.add(author.slice(1))
    //     }
    //   })
    // }
  });

  if (errors.length === 0) {
    console.log(`Merging PR ${prnum}!`);
    response = `Merging PR ${prnum}!`;

    const eipNumbers = eips.join(", ");
    // Github.pulls.merge({
    //   pull_number: pr.number,
    //   repo: pr.base.repo.full_name,
    //   owner: pr.base.repo.owner.login,
    //   commit_title: `Automatically merged updates to draft EIP(s) ${eipNumbers} (#${prnum})`,
    //   commit_message: MERGE_MESSAGE,
    //   merge_method: "squash",
    //   sha: pr.head.sha
    // })
  } else if (errors.length > 0 && eips.length > 0) {
    let message =
      "Hi! I'm a bot, and I wanted to automerge your PR, but couldn't because of the following issue(s):\n\n";
    message += errors.join("\n - ");

    console.log(`posting comment: ${message}`);
    // post_comment(Github)(pr, message)
  }
};
