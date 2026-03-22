/**
 * openSourceApi.js — GitHub 和 Hugging Face 开源项目搜索
 */

// ─── GitHub API ──────────────────────────────────────────────────────────

/**
 * 搜索 GitHub 仓库
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>}
 */
export async function searchGitHubRepos(query, limit = 10) {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    return data.items.map(repo => ({
      id: `github-${repo.id}`,
      source: 'github',
      title: repo.full_name,
      description: repo.description || '暂无描述',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      updatedAt: repo.updated_at,
      owner: {
        name: repo.owner.login,
        avatar: repo.owner.avatar_url,
      },
    }));
  } catch (error) {
    console.warn('GitHub 搜索失败:', error);
    return [];
  }
}

// ─── Hugging Face API ────────────────────────────────────────────────────

/**
 * 搜索 Hugging Face 模型
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>}
 */
export async function searchHuggingFaceModels(query, limit = 10) {
  try {
    const response = await fetch(
      `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`,
      {
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map(model => ({
      id: `hf-model-${model.id}`,
      source: 'huggingface',
      type: 'model',
      title: model.id,
      description: model.pipeline_tag || '机器学习模型',
      url: `https://huggingface.co/${model.id}`,
      downloads: model.downloads || 0,
      likes: model.likes || 0,
      tags: model.tags || [],
      updatedAt: model.lastModified,
    }));
  } catch (error) {
    console.warn('HuggingFace 模型搜索失败:', error);
    return [];
  }
}

/**
 * 搜索 Hugging Face 数据集
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>}
 */
export async function searchHuggingFaceDatasets(query, limit = 5) {
  try {
    const response = await fetch(
      `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`,
      {
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map(dataset => ({
      id: `hf-dataset-${dataset.id}`,
      source: 'huggingface',
      type: 'dataset',
      title: dataset.id,
      description: '数据集',
      url: `https://huggingface.co/datasets/${dataset.id}`,
      downloads: dataset.downloads || 0,
      likes: dataset.likes || 0,
      tags: dataset.tags || [],
    }));
  } catch (error) {
    console.warn('HuggingFace 数据集搜索失败:', error);
    return [];
  }
}

// ─── 综合搜索 ────────────────────────────────────────────────────────────

/**
 * 搜索所有开源平台
 * @param {string} query - 搜索关键词
 * @returns {Promise<Object>} 包含 GitHub 和 HuggingFace 的结果
 */
export async function searchOpenSource(query) {
  const [github, hfModels, hfDatasets] = await Promise.all([
    searchGitHubRepos(query, 8),
    searchHuggingFaceModels(query, 6),
    searchHuggingFaceDatasets(query, 4),
  ]);

  return {
    github,
    huggingface: {
      models: hfModels,
      datasets: hfDatasets,
    },
    total: github.length + hfModels.length + hfDatasets.length,
  };
}

/**
 * 格式化数字（如 12345 -> 12.3k）
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}
