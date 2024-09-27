<template>
  <div>
    <q-btn-dropdown
      split
      outline
      :label="currentCompany !== null ? currentCompany.alias : 'Loading...'"
      class="ellipsis full-width"
    >
      <q-list>
        <q-item
          clickable
          v-close-popup
          dense
          v-for="(company, index) in companies"
          :disable="
            company.enabled && company.user.employee_enabled ? false : true
          "
          :key="index"
          @click="onCompanySelection(company)"
        >
          <q-item-section>
            <q-item-label lines="1"> {{ company.alias }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </div>
  <q-table
    grid
    :rows="files"
    :rows-per-page-options="[50, 100, 150]"
    class="row q-col-gutter-xs full-height full-width default-table full file-explorer-table"
    dense
    :loading="isLoading"
    :row-key="columns[0].name"
    v-model:pagination="pagination"
    @request="getFiles"
    binary-state-sort
  >
    <template v-slot:item="props">
      <div
        :class="[
          'col-12 col-sm-4 col-md-2 image-wrapper q-pa-xs',
          {
            selected: selectedFile && selectedFile['@id'] === props.row['@id'],
          },
        ]"
        @click="selectFile(props.row)"
      >
        <img
          :src="getImage(props.row)"
          :alt="getLabel(props.row)"
          class="responsive-image"
        />
        <div class="file-name">
          {{ getLabel(props.row) }}
        </div>
        <!-- Nome do arquivo -->
        <div class="button-bar text-center">
          <q-btn
            icon="attachment"
            color="white"
            @click.stop="editFile(props.row)"
            flat
            size="sm"
          />
          <q-btn
            icon="delete"
            color="white"
            @click.stop="deleteFile(props.row)"
            flat
            size="sm"
          />
          <q-btn
            icon="check"
            color="white"
            @click.stop="
              selectFile(props.row);
              chooseFile();
            "
            flat
            size="sm"
          />
        </div>
      </div>
    </template>
  </q-table>

  <div class="upload-bars">
    <UploadForm
      :item="selectedFile"
      :open="open"
      :multiple="multiple"
      :accept="getAccept()"
      @fileUploaded="fileUploaded"
    />
  </div>
  <div class="action-bar row justify-end q-pa-sm">
    <q-btn label="Salvar" color="primary" @click="chooseFile" />
  </div>
</template>
<script>
import MyCompanies from "@controleonline/ui-common/src/components/Common/MyCompanies";
import UploadForm from "@controleonline/ui-default/src/components/Default/Common/Inputs/UploadInput.vue";
import { ENTRYPOINT } from "app/config/entrypoint";
import { mapGetters, mapActions } from "vuex";

export default {
  components: {
    UploadForm,
    MyCompanies,
  },
  props: {
    data: {
      required: true,
    },
    fileType: {
      required: true,
      default: () => ["image"],
    },
  },
  data() {
    return {
      open: false,
      currentCompany: {},
      files: [],
      selectedFile: {},
      pagination: { page: 1, rowsPerPage: 50 },
      columns: [
        { name: "image", label: "Imagem", field: "image", align: "center" },
      ],
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      companies: "people/companies",
    }),
    isLoading() {
      return this.$store.getters["file/isLoading"];
    },
  },
  created() {
    this.currentCompany = this.myCompany;
    this.selectFile(this.$copyObject(this.data));
    //this.getFiles();
  },
  watch: {
    currentCompany() {
      this.getFiles();
    },
  },
  methods: {
    ...mapActions({
      getItems: "file/getItems",
    }),
    editFile(file) {
      this.selectFile(file);
      setTimeout(() => {
        this.open = true;
        setTimeout(() => {
          this.open = false;
        }, 300);
      }, 300);
    },
    getAccept() {
      let accept = [];
      this.fileType.forEach((fileType) => {
        switch (fileType) {
          case "image":
            accept.push("image/*");
            break;
          case "application":
            accept.push(".pdf");
            accept.push(".doc");
            accept.push(".html");
            break;
          default:
            break;
        }
      });
      return accept.join(", ");
    },

    onCompanySelection(company) {
      this.currentCompany = company;
    },
    selectFile(file) {
      this.selectedFile = file;
    },
    fileUploaded(file) {
      this.files = [...this.files];
      let indx = this.files.findIndex(
        (file) => file["@id"] === this.selectedFile["@id"]
      );

      if (indx > -1 && this.selectedFile["@id"] == file["@id"]) {
        this.files[indx] = file;
      } else {
        this.files.push(file);
      }
    },
    chooseFile() {
      setTimeout(() => {
        this.$emit("save", this.selectedFile);
      }, 300);
    },
    getFiles() {
      this.getItems({
        people: "/people/" + this.currentCompany?.id,
        file_type: this.fileType,
      }).then((data) => {
        this.files = data;
      });
    },
    getImage(file) {
      return ENTRYPOINT + "/files/download/" + file["@id"].replace(/\D/g, "")+
        "?_=" +
        btoa(file.file_name)
    },
    getLabel(file) {
      return file.file_name;
    },
  },
};
</script>

<style>
.file-explorer-table {
  padding-bottom: 200px;
}

.image-wrapper.selected {
  border: 4px solid var(--primary);
  padding: 2px;
  padding-bottom: 52px;
}

.image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding-bottom: 50px;
  border: 1px solid #ccc;
  position: relative;
  margin-bottom: 20px;
}

.responsive-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.upload-bars {
  position: fixed;
  width: 400px;
  bottom: 0px;
  z-index: 999;
}
.action-bar {
  display: none;
  background-color: var(--secondary);
  position: fixed;
  width: 100%;
  height: 60px;
  bottom: 25px;
  z-index: 998;
  left: 0;
}
.file-name {
  text-align: center;
  position: absolute;
  bottom: 25px;
  width: 100%;
  z-index: 100;
  height: 25px;
  overflow: hidden;
}

.button-bar {
  background-color: var(--secondary);
  position: absolute;
  bottom: 0;
  width: 100%;
  z-index: 100;
  height: 25px;
}
.button-bar button {
  width: 33.333%;
}
</style>
