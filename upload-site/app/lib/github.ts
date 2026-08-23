import { Octokit } from 'octokit'

const octokit = new Octokit({
  auth: process.env.GITHUB_API_TOKEN,
  log: console
})

export const REPO_OWNER = 'Mudlet'
export const REPO_NAME = 'mudlet-package-repository'

export async function createBranch(newBranch: string, fromBranch: string) {
  // Get the SHA of the branch we want to branch from
  const { data: ref } = await octokit.rest.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${fromBranch}`,
  })

  return octokit.rest.git.createRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `refs/heads/${newBranch}`,
    sha: ref.object.sha,
  })
}

/** Whether a branch is there, without caring what it points at. */
export async function branchExists(branch: string): Promise<boolean> {
  try {
    await octokit.rest.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${branch}`,
    })
    return true
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error ? error.status : null
    if (status === 404) {
      return false
    }
    throw error
  }
}

/** Every branch whose name begins with `prefix`, newest-first order not promised. */
export async function branchesWithPrefix(prefix: string): Promise<string[]> {
  try {
    const { data } = await octokit.rest.git.listMatchingRefs({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${prefix}`,
    })
    return data.map((ref) => ref.ref.replace(/^refs\/heads\//, ''))
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error ? error.status : null
    if (status === 404) {
      return []
    }
    throw error
  }
}

/** The open pull request built on `branch`, or null when nothing is open for it. */
export async function openPullRequestForBranch(branch: string) {
  const { data } = await octokit.rest.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'open',
    head: `${REPO_OWNER}:${branch}`,
    per_page: 1,
  })
  return data[0] ?? null
}

/**
 * Drop a branch, ignoring one that is already gone.
 *
 * Used to undo a publish that failed partway: without it a run that died
 * between creating the branch and opening the pull request would leave the
 * branch behind, unreachable by every gate that reviews a publish.
 *
 * Returns whether the branch is now gone, so a caller can say so rather than
 * have the failure swallowed here.
 */
export async function deleteBranch(branch: string): Promise<boolean> {
  try {
    await octokit.rest.git.deleteRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${branch}`,
    })
    return true
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error ? error.status : null
    // Already gone is the outcome we wanted.
    if (status === 404 || status === 422) {
      return true
    }
    console.warn(`Could not delete branch ${branch}:`, error)
    return false
  }
}

export async function getFileSha(path: string) {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
    })
    
    // Response is a single file
    if (!Array.isArray(response.data)) {
      return response.data.sha
    }
    return null
  } catch (error) {
    // File doesn't exist
    return null
  }
}

export async function uploadFile(path: string, content: string, branch: string, message: string, sha?: string) {
  return octokit.rest.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    content,
    branch,
    sha,
  })
}

export async function createPullRequest(branch: string, title: string, body: string) {
  return octokit.rest.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title,
    head: branch,
    base: 'main',
    body,
  })
}

/**
 * Reads a text file off the default branch, or null when it is not there.
 *
 * Goes through the API rather than raw.githubusercontent.com so the answer is
 * never a CDN-cached copy - which matters for anything that grants access, such
 * as the trusted publisher registry.
 */
export async function getFileContent(path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      headers: { 'If-None-Match': '' },
    })
    if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
      return null
    }
    return Buffer.from(data.content, 'base64').toString('utf8')
  } catch (error) {
    if (typeof error === 'object' && error && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function deleteFile(path: string, message: string, sha: string, branch: string) {
  return octokit.rest.repos.deleteFile({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    sha,
    branch,
  })
}
