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
