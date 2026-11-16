import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { ElMessage } from "element-plus";
const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  // 添加这个重定向路由
  {
    path: "/dashboards",
    redirect: "/admin/dashboards"
  },
  {
    path: "/about",
    name: "about",
    component: () =>
      import( "../views/AboutView.vue"),
  },
  {
    path: "/chat",
    name: "chat",
    component: () =>
      import("../views/ChatView.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () =>
      import( "../views/LoginView.vue"),
  },
  {
    path: "/register",
    name: "register",
    component: () =>
      import( "../views/RegisterView.vue"),
  },
  {
    path: "/articles",
    name: "articles",
    component: () =>
      import( "../views/ArticleListView.vue"),
    meta: { requiresAuth: false },
  },
    {
    path: '/hot-articles', // 添加热门文章路由
    name: 'HotArticles',
    component: () =>
      import( "../views/ArticleListView.vue"), // 共用文章列表组件
    meta: { isHot: true } 
  },
  // 在现有路由数组中添加
{
  path: "/followed-articles",
  name: "followed-articles",
  component: () =>
    import("../views/ArticleListView.vue"), // 复用文章列表组件
  meta: { requiresAuth: true }, // 关注动态通常需要登录才能查看，这里改为true更合理
},
  {
    path: "/article/:id?",
    name: "article-detail",
    component: () =>
      import(
        "../views/ArticleDetailView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/article/edit/:id?",
    name: "article-edit",
    component: () =>
      import(
      "../views/ArticleEditView.vue"
      ),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile/:id?",
    name: "profile",
    component: () =>
      import( "../views/ProfileView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/messages",
    name: "messages",
    component: () =>
      import("../views/MessageView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/notifications",
    name: "notifications",
    component: () =>
      import(
         "../views/NotificationView.vue"
      ),
    meta: { requiresAuth: true },
  },
    {
    path: "/spots",
    name: "spots",
    component: () =>
      import(
       "../views/ScenicSportsView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/upload",
    name: "upload",
    component: () =>
      import( "../views/ImageUploadView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/upload/video",
    name: "video-upload",
    component: () =>
      import( "../views/VideoUploadView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/destinations",
    name: "destinations",
    component: () =>
      import(
       "../views/DestinationView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/destination/:id",
    name: "destination-detail",
    component: () =>
      import(
        "../views/DestinationDetailView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/spot/:id",
    name: "spot-detail",
    component: () =>
      import(
        "../views/SpotDetailView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/search",
    name: "search",
    component: () =>
      import(
       "../views/SearchView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/routes",
    name: "route-view",
    component: () =>
      import(
        "../views/RouteView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/routes/edit/:id?",
    name: "route-edit-view",
    component: () =>
      import(
       "../views/RouteEditView.vue"
      ),
    meta: { requiresAuth: true },
  },
  {
    path: "/routes/:id",
    name: "route-detail-view",
    component: () =>
      import(
        "../views/RouteDetailView.vue"
      ),
    meta: { requiresAuth: false },
  },
  {
    path: "/admin",
    component: () =>
      import(
         "../views/admin/AdminLayout.vue"
      ),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: "",
        name: "admin-redirect",
        redirect: "dashboards"
      },
      {
        path: "dashboards",
        name: "admin-dashboard",
        component: () =>
          import(
             "../views/admin/DashboardView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "users",
        name: "admin-users",
        component: () =>
          import(
            "../views/admin/UserManageView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "articles",
        name: "admin-articles",
        component: () =>
          import(
           "../views/admin/ArticleReviewView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "comments",
        name: "admin-comments",
        component: () =>
          import(
           "../views/admin/CommentReviewView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "categories",
        name: "admin-categories",
        component: () =>
          import(
            "../views/admin/CategoryManageView.vue"
          ),
        meta: {
          title: "分类管理",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "tags",
        name: "admin-tags",
        component: () =>
          import(
           "../views/admin/TagsManageView.vue"
          ),
        meta: {
          title: "标签管理",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "scenic-spots",
        name: "admin-scenic-spots",
        component: () =>
            import(
                "../views/admin/AdminScenicSportsView.vue"
                ),
        meta: {
          title: "景点管理",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "destinations",
        name: "admin-destinations",
        component: () =>
            import(
                "../views/admin/DestinationManageView.vue"
                ),
        meta: {
          title: "目的地管理",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "admin-info",
        name: "admin-info",
        component: () =>
          import(
           "../views/admin/AdminInfoView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "monitor",
        name: "admin-monitor",
        component: () =>
          import(
           "../views/admin/MonitorView.vue"
          ),
        meta: { requiresAuth: true, requiresAdmin: true },
      }
    ],
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// 全局导航守卫
router.beforeEach((to, from, next) => {
  const token = !!localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 如果直接访问 /dashboards，重定向到 /admin/dashboards
  if (to.path === "/dashboards" && role === "admin" && token) {
    next("/admin/dashboards");
    return;
  }

  // 如果是管理员访问根路径，自动跳转到管理员界面
  if (to.path === "/" && role === "admin" && token) {
    next("/admin");
    return;
  }

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!token) {
      next("/login");
      ElMessage.warning("请先登录");
      return;
    }
    // 检查管理员权限
    if (to.matched.some((record) => record.meta.requiresAdmin)) {
      if (role !== "admin") {
        next("/");
        ElMessage.error("权限不足");
        return;
      }
    }
  }
  next();
});

export default router;
