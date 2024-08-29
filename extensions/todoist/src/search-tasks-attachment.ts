import { SyncData } from "./api";
import { getTodoistApi, withTodoistApi } from "./helpers/withTodoistApi";

const fetchTasks: Attachments.SearchTasksAttachment = async () => {
  const todoistApi = getTodoistApi();

  const { data } = await todoistApi.post<SyncData>("/sync", { sync_token: "*", resource_types: ["all"] });

  const tasks = data.items;

  // associate each task with their projects and labels using .map
  const projects = data.projects;
  const labels = data.labels;

  const detailedTasks = tasks.map((task) => {
    const project = projects.find((project) => project.id === task.project_id);
    const labelNames = task.labels.map((labelId) => labels.find((label) => label.id === labelId)?.name).filter(Boolean);

    return {
      ...task,
      project: project?.name,
      labels: labelNames,
    };
  });

  return JSON.stringify(detailedTasks, null, "  ");
};

export default withTodoistApi(fetchTasks);
