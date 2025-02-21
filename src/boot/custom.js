import { boot } from "quasar/wrappers";
import DefaultTable from "@controleonline/ui-default/src/components/Default/DefaultTable";
import DefaultForm from "@controleonline/ui-default/src/components/Default/Common/DefaultForm";
import File from "@controleonline/ui-default/src/components/Default/Common/Inputs/File.vue";
import FileExplorer from "@controleonline/ui-common/src/components/Common/FileExplorer";
import DefaultButtonDialog from "@controleonline/ui-default/src/components/Default/DefaultButtonDialog";
import DefaultComponent from "@controleonline/ui-default/src/components/Default/DefaultComponent.vue";
import DefaultInput from "@controleonline/ui-default/src/components/Default/DefaultInput.vue";

export default boot(({ app }) => {
  app.component("DefaultTable", DefaultTable);
  app.component("DefaultButtonDialog", DefaultButtonDialog);
  app.component("FileExplorer", FileExplorer);
  app.component("DefaultForm", DefaultForm);
  app.component("File", File);
  app.component("DefaultComponent", DefaultComponent);
  app.component("DefaultInput", DefaultInput);

  app.config.globalProperties.$components = {
    DefaultTable,
    DefaultComponent,
    DefaultButtonDialog,
    DefaultInput,
    FileExplorer,
    DefaultForm,
    File,
  };
});
