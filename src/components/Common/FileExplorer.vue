<template>
  <UploadForm
    :open="open"
    :multiple="multiple"
    :accept="accept"
    @fileUploaded="fileUploaded"
  />
  <q-table
    grid
    :rows="files"
    :rows-per-page-options="[50, 100, 150]"
    class="row q-col-gutter-xs full-height full-width default-table full"
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
      </div>
    </template>
  </q-table>

  <div class="q-table-pagination row items-center q-pa-sm">
    <q-btn label="Salvar" color="primary" @click="chooseFile" />
  </div>
</template>
<script>
import UploadForm from "@controleonline/ui-default/src/components/Default/Common/Inputs/UploadInput.vue";
import { ENTRYPOINT } from "app/config/entrypoint";
import { mapGetters, mapActions } from "vuex";

export default {
  components: {
    UploadForm,
  },
  props: {
    data: {
      required: true,
    },
    accept: {
      required: true,
      default: () => ".jpg, .pdf, image/*",
    },
  },
  data() {
    return {
      files: [], // Lista de arquivos
      selectedFile: {}, // Arquivo selecionado
      pagination: { page: 1, rowsPerPage: 50 }, // Controle de paginação
      columns: [
        { name: "image", label: "Imagem", field: "image", align: "center" }, // Coluna
      ],
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
    }),
    isLoading() {
      return this.$store.getters["file/isLoading"];
    },
  },
  created() {
    this.selectFile(this.$copyObject(this.data));
    this.getFiles();
  },
  methods: {
    ...mapActions({
      getItems: "file/getItems",
    }),
    selectFile(file) {
      this.selectedFile = file;
    },
    fileUploaded(file) {
      this.files = [...this.files, file];
    },
    chooseFile() {
      this.$emit("save", this.selectedFile);
    },
    getFiles() {
      this.getItems({ people: "/people/" + this.myCompany?.id }).then(
        (data) => {
          this.files = data;
        }
      );
    },
    getImage(file) {
      return ENTRYPOINT + "/files/download/" + file["@id"].replace(/\D/g, "");
    },
    getLabel(file) {
      return "image";
    },
  },
};
</script>

<style scoped>
.image-wrapper.selected {
  border: 2px solid #42b983;
  padding: 2px;
}

.image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  /* border: 1px solid #ccc;*/
}

.responsive-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
