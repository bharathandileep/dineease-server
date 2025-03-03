export const apiConfig = {
  baseAPIUrl: `/api/v1`,
  auth: {
    google: "/google-auth",
    sendOtp: "/send-otp",
    loginOtp: "/login-Otp",
    verifyOtp: "/verify-otp",
    verifyLoginOtp: "/verify-loginotp",
    logout: "/logout",

    adminLogin: "/admin/login",
    adminRegister: "/admin/register",
    accessToken: "/new/access-token",
    forgotPassword: "/admin/forgot-password",
    verifyForgotOtp: "/admin/verify-password",
    updatePassword: "/admin/update-password",
    
    userLogins:"/access/login",
    userRegister:"/access/register"
  },
  kitchens: {
    newkitchens: "/new",
    updatekitchens: "/update/:id",
    deletekitchens: "/delete/:kitchenId",
    getAllkitchens: "/all",
    getkitchensById: "/:kitchenId",
    toggleKitchensStatus: "/status/:id",

    createCategory: "/categories",
    getAllCategories: "/categories/all",
    updateCategory: "/categories/:id",
    deleteCategory: "/categories/:id",
    toggleCategoryStatus: "/categories/:id/toggle-status",

    getAllSubCategories: "/subcategories/all",
    createSubcategory: "/subcategories",
    getSubcategoriesByCategory: "/categories/:categoryId/subcategories",
    getSubcategoryById: "/subcategories/:id",
    updateSubcategory: "/subcategories/:id",
    deleteSubcategory: "/subcategories/:id",
    toggleSubcategoryStatus: "/subcategories/:id/toggle-status",

    

  },
  menu: {
    createCategory: "/categories",
    getAllCategories: "/categories",
    updateCategory: "/categories/:id",
    deleteCategory: "/categories/:id",
    toggleCategoryStatus: "/categories/:id/toggle-status",

    getAllSubCategories: "/subcategories",
    getAllCategoriesByStatus: "/category/status",
    createSubcategory: "/subcategories",
    getSubcategoriesByCategory: "/categories/:categoryId/subcategories",
    getSubcategoryById: "/subcategories/:id",
    updateSubcategory: "/subcategories/:id",
    deleteSubcategory: "/subcategories/:id",
    toggleSubcategoryStatus: "/subcategories/:id/toggle-status",

    createItem: "/allmenuitems",
    getItemById: "/allmenuitems/:id",
    listItems: "/allmenuitems",
    updateItem: "/allmenuitems/:id",
    deleteItem: "/allmenuitems/:id",
    // changeItemStatus:"/allmenuitems/:id/status"
    changeItemStatus: "/allmenuitems/:id/status",
  },
  organization: {
    newOrganization: "/new",
    updateOrganization: "/update/:id",
    deleteOrganization: "/delete/:orgId",
    getAllOrganization: "/all",
    getOrganizationById: "/:orgId",
    toggleOrganizationStatus:"/status/:id",

    createCategory: "/categories",
    getAllCategories: "/categories/all",
    updateCategory: "/categories/:id",
    deleteCategory: "/categories/:id",
    toggleCategoryStatus: "/categories/:id/toggle-status",

    getAllSubCategories: "/subcategories/all",
    createSubcategory: "/subcategories",
    getSubcategoriesByCategory: "/categories/:categoryId/subcategories",
    getSubcategoryById: "/subcategories/:id",
    updateSubcategory: "/subcategories/:id",
    deleteSubcategory: "/subcategories/:id",
    toggleSubcategoryStatus: "/subcategories/:id/toggle-status",
    getAllCategoriesByStatus: "/category/status",
  },
  designation: {
    createDesignation: "/designations",
    getAllDesignations: "/designations/all",
    getDesignationById: "/designations/:id",
    updateDesignation: "/designations/:id",
    deleteDesignation: "/designations/:id",
    toggleDesignationStatus: "/designations/:id/toggle-status",
  },
  employee: {
    createEmployee: "/employees",
    getAllEmployees: "/employees/all",
    getEmployeeById: "/employees/:id",
    updateEmployee: "/employees/:id",
    deleteEmployee: "/employees/:id",
    toggleEmployeeStatus: "/employees/:id/toggle-status",
  },
  orgemployee: {
    createOrgEmployee: "/orgemployee",
    getAllEmployeesOfOrg: "/orgemployee/all",
    getOrgEmployeeById: "/orgemployee/:id",
    updateOrgEmployee: "/orgemployee/:id",
    deleteOrgEmployee: "/orgemployee/:id",
    toggleOrgEmployeeStatus: "/orgemployee/:id/toggle-status",
  },
  addressDetails:{
     getAllCountries: "/allcountries",
    getStatesByCountry: "/states/:countryName",
    getCitiesByState: "/cities/:stateName",
    getDistrictsByState:"/districts/:stateId",
    //getcitiesByDistricts:"/cities/:districtName"
  },

  kitchenMenu: {
    getKitchenMenu: "/kitchen-menu/:kitchenId",
    createkitchenMenu: "/kitchen-menu/:id",
    getkitchenMenuItemDetail: "/:kitchenId/menu-item/:itemId",
    removekitchenMenu: "/kitchen-menu/:kitchen_id/remove/:item_id",
    updateKitchenMenu: "/:kitchenId/menu-item/:itemId",
    deleteSubcategory: "/kitchen-menu/subcategories/:id",
    toggleSubcategoryStatus: "/kitchen-menu/subcategories/:id/toggle-status",
  },
};
