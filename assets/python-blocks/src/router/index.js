import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "python-blocks-home",
      component: () => import("../views/PythonBlocksBoard.vue"),
    },
    {
      path: "/python-blocks",
      name: "python-blocks",
      component: () => import("../views/PythonBlocksBoard.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

export default router;
